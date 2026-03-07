import { createClient } from "../client/supabase/server";
import type { Tables, TablesUpdate } from "../client/supabase/types";

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
  role?: RoleInput;
  cohort?: CohortInput;
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
  "role",
  "cohort",
]);

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

  const hasFields = Object.keys(updates).length > 0;
  let role: RoleInput | undefined;
  let cohort: CohortInput | undefined;

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

  if (!hasFields && !role && !cohort) {
    return {
      error:
        "At least one updatable field is required (volunteer fields, role, or cohort)",
    };
  }

  const result: VolunteerValidationResult = { updates };
  if (role) {
    result.role = role;
  }
  if (cohort) {
    result.cohort = cohort;
  }

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
  if (!validation.updates) {
    return {
      status: 400,
      body: { error: validation.error ?? "Invalid volunteer update payload" },
    };
  }

  const client = await createClient();
  const timestamp = new Date().toISOString();

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
      return { status: 400, body: { error: "Role not found" } };
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
      return { status: 400, body: { error: "Cohort not found" } };
    }

    cohortRow = data;
  }

  const { data: volunteer, error: volunteerError } = await client
    .from("Volunteers")
    .update({ ...validation.updates, updated_at: timestamp })
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

  return { status: 200, body: { volunteer } };
}
