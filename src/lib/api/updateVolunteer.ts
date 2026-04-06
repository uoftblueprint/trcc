"use server";

import { createAdminClient } from "../client/supabase/server";
import type { Json, Tables, TablesUpdate } from "../client/supabase/types";

const ROLE_TYPES = ["prior", "current", "future_interest"] as const;
const COHORT_TERMS = ["fall", "summer", "winter", "spring"] as const;
const POSITION_VALUES = ["member", "volunteer", "staff"] as const;
const COHORT_TERM_CANONICAL: Record<(typeof COHORT_TERMS)[number], string> = {
  fall: "Fall",
  summer: "Summer",
  winter: "Winter",
  spring: "Spring",
};

type VolunteerUpdatePayload = Pick<
  TablesUpdate<"Volunteers">,
  | "name_org"
  | "email"
  | "phone"
  | "pronouns"
  | "pseudonym"
  | "position"
  | "notes"
  | "opt_in_communication"
>;

type RoleInput = { name: string; type: (typeof ROLE_TYPES)[number] };
type CohortInput = { year: number; term: string };

type UpdateVolunteerResult =
  | { status: 200; body: { volunteer: Tables<"Volunteers"> } }
  | { status: 400 | 404 | 500; body: { error: string } };

type VolunteerValidationResult = {
  updates?: Partial<VolunteerUpdatePayload>;
  customDataPatch?: Record<string, unknown>;
  role?: RoleInput;
  cohort?: CohortInput;
  roles?: RoleInput[];
  cohorts?: CohortInput[];
  error?: string;
};

// keep this in sync with allowed patch fields on the volunteers table
const ALLOWED_VOLUNTEER_FIELDS = new Set<keyof VolunteerUpdatePayload>([
  "name_org",
  "email",
  "phone",
  "pronouns",
  "pseudonym",
  "position",
  "notes",
  "opt_in_communication",
]);
const ALLOWED_TOP_LEVEL_FIELDS = new Set<string>([
  ...ALLOWED_VOLUNTEER_FIELDS,
  "custom_data",
  "role",
  "cohort",
  "roles",
  "cohorts",
]);

type CustomColDef = Pick<
  Tables<"CustomColumns">,
  "column_key" | "data_type" | "tag_options" | "is_multi"
>;

function normalizeCustomFieldValue(
  def: CustomColDef,
  raw: unknown
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (raw === null) {
    return { ok: true, value: null };
  }

  if (def.data_type === "text") {
    if (typeof raw !== "string")
      return {
        ok: false,
        error: `Custom "${def.column_key}" must be a string or null`,
      };
    const t = raw.trim();
    return { ok: true, value: t === "" ? null : raw };
  }

  if (def.data_type === "number") {
    if (raw === "") return { ok: true, value: null };
    if (typeof raw === "number") {
      if (!Number.isFinite(raw))
        return {
          ok: false,
          error: `Custom "${def.column_key}" must be a finite number`,
        };
      return { ok: true, value: raw };
    }
    if (typeof raw === "string") {
      const s = raw.trim();
      if (s === "") return { ok: true, value: null };
      const n = Number(s);
      if (!Number.isFinite(n))
        return {
          ok: false,
          error: `Custom "${def.column_key}" must be a number`,
        };
      return { ok: true, value: n };
    }
    return {
      ok: false,
      error: `Custom "${def.column_key}" must be a number or null`,
    };
  }

  if (def.data_type === "boolean") {
    if (typeof raw === "boolean") return { ok: true, value: raw };
    return {
      ok: false,
      error: `Custom "${def.column_key}" must be a boolean or null`,
    };
  }

  if (def.data_type === "tag") {
    const allowed = new Set((def.tag_options ?? []).filter(Boolean));
    const requireOption = allowed.size > 0;

    if (def.is_multi) {
      if (!Array.isArray(raw)) {
        return {
          ok: false,
          error: `Custom "${def.column_key}" must be an array of tags or null`,
        };
      }
      const tags = [
        ...new Set(raw.map((x) => String(x).trim()).filter(Boolean)),
      ].sort();
      if (requireOption) {
        for (const t of tags) {
          if (!allowed.has(t)) {
            return {
              ok: false,
              error: `Invalid tag "${t}" for "${def.column_key}"`,
            };
          }
        }
      }
      return { ok: true, value: tags };
    }

    if (typeof raw !== "string") {
      return {
        ok: false,
        error: `Custom "${def.column_key}" must be a string tag or null`,
      };
    }
    const t = raw.trim();
    if (t === "") return { ok: true, value: null };
    if (requireOption && !allowed.has(t)) {
      return { ok: false, error: `Invalid tag "${t}" for "${def.column_key}"` };
    }
    return { ok: true, value: t };
  }

  return { ok: false, error: `Unknown data type for "${def.column_key}"` };
}

async function mergeVolunteerCustomData(
  client: ReturnType<typeof createAdminClient>,
  volunteerId: number,
  patch: Record<string, unknown>
): Promise<{ ok: true; merged: Json } | { ok: false; error: string }> {
  const { data: defs, error: defErr } = await client
    .from("CustomColumns")
    .select("column_key, data_type, tag_options, is_multi");

  if (defErr) return { ok: false, error: defErr.message };
  const byKey = new Map((defs ?? []).map((d) => [d.column_key, d]));

  const { data: row, error: rowErr } = await client
    .from("Volunteers")
    .select("custom_data")
    .eq("id", volunteerId)
    .maybeSingle();

  if (rowErr) return { ok: false, error: rowErr.message };

  const base =
    row?.custom_data &&
    typeof row.custom_data === "object" &&
    !Array.isArray(row.custom_data)
      ? { ...(row.custom_data as Record<string, unknown>) }
      : {};

  for (const [key, raw] of Object.entries(patch)) {
    const def = byKey.get(key);
    if (!def) {
      return { ok: false, error: `Unknown custom column key: ${key}` };
    }
    const norm = normalizeCustomFieldValue(def, raw);
    if (!norm.ok) {
      return { ok: false, error: norm.error };
    }
    const v = norm.value;
    if (v === null || v === undefined) {
      delete base[key];
    } else {
      base[key] = v;
    }
  }

  return { ok: true, merged: base as Json };
}

function validateVolunteerUpdateBody(body: unknown): VolunteerValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const payload = body as Record<string, unknown>;
  const unknownKeys = Object.keys(payload).filter(
    (key) => !ALLOWED_TOP_LEVEL_FIELDS.has(key)
  );

  if (unknownKeys.length > 0) {
    return {
      error: `Unknown field(s): ${unknownKeys.join(", ")}`,
    };
  }

  // name_org is the only required patchable field; validate it eagerly
  const updates: Partial<VolunteerUpdatePayload> = {};
  if ("name_org" in payload) {
    const value = payload["name_org"];
    if (value === null || value === undefined) {
      return { error: "Field name_org must be provided as a non-empty string" };
    }
    if (typeof value !== "string") {
      return { error: "Field name_org must be a string" };
    }
    if (value.trim().length === 0) {
      return { error: "Field name_org cannot be empty" };
    }
    updates.name_org = value;
  }

  // optional string-ish fields can be patched with string or null
  const stringFields = [
    "email",
    "phone",
    "pronouns",
    "pseudonym",
    "position",
    "notes",
  ] as const;

  for (const key of stringFields) {
    if (key in payload) {
      const value = payload[key];

      if (value === undefined || value === null) {
        updates[key] = null;
      } else if (typeof value === "string") {
        if (
          key === "position" &&
          !POSITION_VALUES.includes(value as (typeof POSITION_VALUES)[number])
        ) {
          return {
            error: `Field position must be one of ${POSITION_VALUES.join(", ")}`,
          };
        }
        updates[key] = value;
      } else {
        return { error: `Field ${key} must be a string or null` };
      }
    }
  }

  if ("opt_in_communication" in payload) {
    const value = payload["opt_in_communication"];
    if (value === undefined || value === null) {
      updates.opt_in_communication = null;
    } else if (typeof value === "boolean") {
      updates.opt_in_communication = value;
    } else {
      return {
        error: "Field opt_in_communication must be a boolean or null",
      };
    }
  }

  let customDataPatch: Record<string, unknown> | undefined;
  if ("custom_data" in payload) {
    const cd = payload["custom_data"];
    if (cd === undefined) {
      /* not patching custom_data */
    } else if (cd === null || typeof cd !== "object" || Array.isArray(cd)) {
      return { error: "Field custom_data must be an object" };
    } else {
      customDataPatch = { ...(cd as Record<string, unknown>) };
    }
  }

  const hasFields = Object.keys(updates).length > 0;
  const hasCustomPatch =
    customDataPatch !== undefined && Object.keys(customDataPatch).length > 0;

  let role: RoleInput | undefined;
  let cohort: CohortInput | undefined;
  let roles: RoleInput[] | undefined;
  let cohorts: CohortInput[] | undefined;

  if ("role" in payload) {
    const r = payload["role"];
    if (!r || typeof r !== "object" || Array.isArray(r)) {
      return { error: "Field role must be an object" };
    }
    const { name, type } = r as Record<string, unknown>;

    if (typeof name !== "string" || name.trim().length === 0) {
      return { error: "Field role.name must be a non-empty string" };
    }
    if (
      typeof type !== "string" ||
      !ROLE_TYPES.includes(type as (typeof ROLE_TYPES)[number])
    ) {
      return {
        error: `Field role.type must be one of ${ROLE_TYPES.join(", ")}`,
      };
    }
    role = { name, type: type as RoleInput["type"] };
  }

  if ("cohort" in payload) {
    const c = payload["cohort"];
    if (!c || typeof c !== "object" || Array.isArray(c)) {
      return { error: "Field cohort must be an object" };
    }
    const { year, term } = c as Record<string, unknown>;
    if (!Number.isInteger(year)) {
      return { error: "Field cohort.year must be an integer" };
    }
    if (typeof term !== "string") {
      return {
        error: `Field cohort.term must be one of ${COHORT_TERMS.join(", ")}`,
      };
    }
    const normalizedTerm = term.trim().toLowerCase();
    if (
      !COHORT_TERMS.includes(normalizedTerm as (typeof COHORT_TERMS)[number])
    ) {
      return {
        error: `Field cohort.term must be one of ${COHORT_TERMS.join(", ")}`,
      };
    }
    cohort = {
      year: year as number,
      term: COHORT_TERM_CANONICAL[
        normalizedTerm as (typeof COHORT_TERMS)[number]
      ],
    };
  }

  if ("roles" in payload) {
    const rs = payload["roles"];
    if (!Array.isArray(rs)) return { error: "Field roles must be an array" };
    roles = [];
    for (const r of rs) {
      if (!r || typeof r !== "object" || Array.isArray(r))
        return { error: "Each role must be an object" };
      const { name, type } = r as Record<string, unknown>;
      if (typeof name !== "string" || name.trim().length === 0)
        return { error: "Field roles[].name must be a non-empty string" };
      if (
        typeof type !== "string" ||
        !ROLE_TYPES.includes(type as (typeof ROLE_TYPES)[number])
      ) {
        return {
          error: `Field roles[].type must be one of ${ROLE_TYPES.join(", ")}`,
        };
      }
      roles.push({ name, type: type as RoleInput["type"] });
    }
  }

  if ("cohorts" in payload) {
    const cs = payload["cohorts"];
    if (!Array.isArray(cs)) return { error: "Field cohorts must be an array" };
    cohorts = [];
    for (const c of cs) {
      if (!c || typeof c !== "object" || Array.isArray(c))
        return { error: "Each cohort must be an object" };
      const { year, term } = c as Record<string, unknown>;
      if (!Number.isInteger(year))
        return { error: "Field cohorts[].year must be an integer" };
      if (typeof term !== "string")
        return { error: "Field cohorts[].term must be a string" };
      const normalizedTerm = term.trim().toLowerCase();
      if (
        !COHORT_TERMS.includes(normalizedTerm as (typeof COHORT_TERMS)[number])
      ) {
        return {
          error: `Field cohorts[].term must be one of ${COHORT_TERMS.join(", ")}`,
        };
      }
      cohorts.push({
        year: year as number,
        term: COHORT_TERM_CANONICAL[
          normalizedTerm as (typeof COHORT_TERMS)[number]
        ],
      });
    }
  }

  if (!hasFields && !role && !cohort && !roles && !cohorts && !hasCustomPatch) {
    return {
      error:
        "At least one updatable field is required (volunteer fields, role, cohort, or custom_data)",
    };
  }

  const result: VolunteerValidationResult = { updates };
  if (hasCustomPatch && customDataPatch)
    result.customDataPatch = customDataPatch;
  if (role) result.role = role;
  if (cohort) result.cohort = cohort;
  if (roles) result.roles = roles;
  if (cohorts) result.cohorts = cohorts;

  return result;
}

export async function updateVolunteer(
  volunteerId: unknown,
  body: unknown
): Promise<UpdateVolunteerResult> {
  if (!Number.isInteger(volunteerId) || (volunteerId as number) <= 0) {
    return { status: 400, body: { error: "Invalid volunteer id" } };
  }

  const validation = validateVolunteerUpdateBody(body);
  if (validation.error || validation.updates === undefined) {
    return {
      status: 400,
      body: { error: validation.error ?? "Invalid volunteer update payload" },
    };
  }

  const client = createAdminClient();
  const timestamp = new Date().toISOString();

  let mergedCustomData: Json | undefined;
  if (
    validation.customDataPatch &&
    Object.keys(validation.customDataPatch).length > 0
  ) {
    const merged = await mergeVolunteerCustomData(
      client,
      volunteerId as number,
      validation.customDataPatch
    );
    if (!merged.ok) {
      return { status: 400, body: { error: merged.error } };
    }
    mergedCustomData = merged.merged;
  }

  let roleRow: { id: number } | null = null;
  if (validation.role) {
    const { name, type } = validation.role;
    const { data, error } = await client
      .from("Roles")
      .select("id")
      .eq("name", name)
      .eq("type", type)
      .maybeSingle();

    if (error) {
      return { status: 500, body: { error: error.message } };
    }

    if (!data) {
      return {
        status: 400,
        body: { error: `Role not found: ${name} (${type})` },
      };
    }

    roleRow = data;
  }

  let cohortRow: { id: number } | null = null;
  if (validation.cohort) {
    const { year, term } = validation.cohort;
    const { data, error } = await client
      .from("Cohorts")
      .select("id")
      .eq("year", year)
      .ilike("term", term)
      .maybeSingle();

    if (error) {
      return { status: 500, body: { error: error.message } };
    }

    if (!data) {
      return {
        status: 400,
        body: { error: `Cohort not found: ${term} ${year}` },
      };
    }

    cohortRow = data;
  }

  let roleIds: number[] = [];
  if (validation.roles !== undefined && validation.roles.length > 0) {
    const { data: foundRoles, error: rolesError } = await client
      .from("Roles")
      .select("id, name, type");
    if (rolesError) return { status: 500, body: { error: rolesError.message } };

    for (const r of validation.roles) {
      const match = foundRoles?.find(
        (fr) =>
          fr.name.toLowerCase() === r.name.toLowerCase() && fr.type === r.type
      );
      if (match) roleIds.push(match.id);
      else
        return {
          status: 400,
          body: { error: `Role not found: ${r.name} (${r.type})` },
        };
    }
  }

  let cohortIds: number[] = [];
  if (validation.cohorts !== undefined && validation.cohorts.length > 0) {
    const { data: foundCohorts, error: cohortsError } = await client
      .from("Cohorts")
      .select("id, term, year");
    if (cohortsError)
      return { status: 500, body: { error: cohortsError.message } };

    for (const c of validation.cohorts) {
      const match = foundCohorts?.find(
        (fc) =>
          fc.term.toLowerCase() === c.term.toLowerCase() && fc.year === c.year
      );
      if (match) cohortIds.push(match.id);
      else
        return {
          status: 400,
          body: { error: `Cohort not found: ${c.term} ${c.year}` },
        };
    }
  }

  const { data: volunteer, error: volunteerError } = await client
    .from("Volunteers")
    .update({
      ...validation.updates,
      ...(mergedCustomData !== undefined
        ? { custom_data: mergedCustomData }
        : {}),
      updated_at: timestamp,
    })
    .eq("id", volunteerId as number)
    .select()
    .maybeSingle();

  if (volunteerError) {
    return { status: 500, body: { error: volunteerError.message } };
  }

  if (!volunteer) {
    return { status: 404, body: { error: "Volunteer not found" } };
  }

  if (validation.role && roleRow) {
    const { data: roleLink, error: roleLinkError } = await client
      .from("VolunteerRoles")
      .select("role_id")
      .eq("volunteer_id", volunteerId as number)
      .eq("role_id", roleRow.id)
      .maybeSingle();

    if (roleLinkError) {
      return { status: 500, body: { error: roleLinkError.message } };
    }

    if (!roleLink) {
      const { error: roleInsertError } = await client
        .from("VolunteerRoles")
        .insert({
          volunteer_id: volunteerId as number,
          role_id: roleRow.id,
          created_at: timestamp,
        });

      if (roleInsertError) {
        return { status: 500, body: { error: roleInsertError.message } };
      }
    }
  }

  if (validation.cohort && cohortRow) {
    const { data: cohortLink, error: cohortLinkError } = await client
      .from("VolunteerCohorts")
      .select("cohort_id")
      .eq("volunteer_id", volunteerId as number)
      .eq("cohort_id", cohortRow.id)
      .maybeSingle();

    if (cohortLinkError) {
      return { status: 500, body: { error: cohortLinkError.message } };
    }

    if (!cohortLink) {
      const { error: cohortInsertError } = await client
        .from("VolunteerCohorts")
        .insert({
          volunteer_id: volunteerId as number,
          cohort_id: cohortRow.id,
          created_at: timestamp,
        });

      if (cohortInsertError) {
        return { status: 500, body: { error: cohortInsertError.message } };
      }
    }
  }

  if (validation.roles !== undefined) {
    const { error: delError } = await client
      .from("VolunteerRoles")
      .delete()
      .eq("volunteer_id", volunteerId as number);
    if (delError) return { status: 500, body: { error: delError.message } };

    if (roleIds.length > 0) {
      roleIds = [...new Set(roleIds)];
      const insertPayload = roleIds.map((rId) => ({
        volunteer_id: volunteerId as number,
        role_id: rId,
        created_at: timestamp,
      }));
      const { error: insError } = await client
        .from("VolunteerRoles")
        .insert(insertPayload);
      if (insError) return { status: 500, body: { error: insError.message } };
    }
  }

  if (validation.cohorts !== undefined) {
    const { error: delError } = await client
      .from("VolunteerCohorts")
      .delete()
      .eq("volunteer_id", volunteerId as number);
    if (delError) return { status: 500, body: { error: delError.message } };

    if (cohortIds.length > 0) {
      cohortIds = [...new Set(cohortIds)];
      const insertPayload = cohortIds.map((cId) => ({
        volunteer_id: volunteerId as number,
        cohort_id: cId,
        created_at: timestamp,
      }));
      const { error: insError } = await client
        .from("VolunteerCohorts")
        .insert(insertPayload);
      if (insError) return { status: 500, body: { error: insError.message } };
    }
  }

  return { status: 200, body: { volunteer } };
}
