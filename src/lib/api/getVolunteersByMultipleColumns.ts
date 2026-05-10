"use server";

import { createClient } from "../client/supabase/server";
import type { Database } from "../client/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BLANK_FIELD_FILTER_VALUE,
  CONTACT_INCOMPLETE_FIELD,
  CONTACT_INCOMPLETE_FILTER_VALUE,
} from "../volunteerFilterShortcuts";

const OP = {
  AND: "AND",
  OR: "OR",
} as const;

const ALLOWED_FIELDS = [
  "name_org",
  "pseudonym",
  "pronouns",
  "email",
  "phone",
  "position",
  "opt_in_communication",
  "notes",
  "created_at",
  "updated_at",
  "id",
  "current_roles",
  "prior_roles",
  "future_interests",
  "cohorts",
  CONTACT_INCOMPLETE_FIELD,
];

/** Volunteer scalar columns filtered with substring match (ilike), not exact `in()`. */
const TEXT_SUBSTRING_MATCH_FIELDS = new Set<string>([
  "name_org",
  "pseudonym",
  "email",
  "phone",
  "position",
  "notes",
]);

export type FilterTuple = {
  field: string;
  miniOp: "AND" | "OR";
  values: string[] | [string, string][];
};

type ValidationResult =
  | { valid: true; cleanedFiltersList: FilterTuple[] }
  | { valid: false; error: string };

type VolunteerFilterResponse =
  | { data: number[]; error?: never }
  | { data?: never; error: string };

/**
 * Returns a filtered list of volunteer ids based on a list filters.
 *
 * The function allows filtering by roles, cohorts, or by a general attribute
 * of a volunteer, with AND/OR logic for each filter.
 *
 * @param filtersList - An array of filter tuples. Each tuple contains:
 * - field: The general attribute, prior, current or future roles, or cohorts.
 * - miniOp: The operation to apply ('AND'/'OR').
 * - values: The array of values to filter by.
 * @param op - The global operation on the filters ('AND'/'OR').
 *
 * @returns A Promise resolving to an object containing:
 * - data: Volunteer ids.
 * - error: Error message.
 */
export async function getVolunteersByMultipleColumns(
  filtersList: FilterTuple[],
  op: string
): Promise<VolunteerFilterResponse> {
  const validation = await validateMultipleColumnFilter(filtersList, op);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const cleanFiltersList = validation.cleanedFiltersList;

  const client = await createClient();

  if (cleanFiltersList.length === 0) {
    return { data: [] };
  }

  try {
    const promises = cleanFiltersList.map(async (f) => {
      if (f.field === CONTACT_INCOMPLETE_FIELD) {
        return filterIdsContactIncomplete(client);
      }
      if (
        f.field === "current_roles" ||
        f.field === "prior_roles" ||
        f.field === "future_interests"
      ) {
        let roleType: "current" | "prior" | "future_interest";
        if (f.field === "current_roles") roleType = "current";
        else if (f.field === "prior_roles") roleType = "prior";
        else roleType = "future_interest";

        return filterIdsByRolesTextSearch(
          client,
          f.miniOp,
          f.values as string[],
          roleType
        );
      } else if (f.field === "cohorts") {
        return filterIdsByRolesTextSearch(
          client,
          f.miniOp,
          f.values as string[],
          "training"
        );
      } else {
        return filterIdsByGeneral(
          client,
          f.field,
          f.miniOp,
          f.values as string[]
        );
      }
    });

    const querySets: Set<number>[] = await Promise.all(promises);

    let finalIds: Set<number>;
    if (op === OP.AND) {
      finalIds = querySets.reduce((acc, cur) => {
        return acc.intersection(cur);
      });
    } else {
      finalIds = querySets.reduce((acc, cur) => {
        return acc.union(cur);
      });
    }

    if (finalIds.size === 0) return { data: [] };

    return { data: Array.from(finalIds) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { error: message };
  }
}

export async function validateMultipleColumnFilter(
  filtersList: FilterTuple[],
  op: string
): Promise<ValidationResult> {
  if (!Array.isArray(filtersList))
    return { valid: false, error: "'filtersList' must be an array" };

  if (!op || !(op === OP.AND || op === OP.OR))
    return { valid: false, error: "Invalid global operation" };

  const cleanedFiltersList: FilterTuple[] = [];

  for (const inputF of filtersList) {
    const f = {
      ...inputF,
      field: inputF.field?.toLowerCase() ?? "",
      miniOp: (inputF.miniOp?.toUpperCase() as "AND" | "OR") ?? "",
    };

    if (!f.miniOp || !(f.miniOp === OP.AND || f.miniOp === OP.OR))
      return { valid: false, error: "Invalid filter mini-operation" };

    if (!f.field || typeof f.field !== "string")
      return { valid: false, error: "Invalid filter field" };

    if (!f.field || !ALLOWED_FIELDS.includes(f.field))
      return { valid: false, error: "Invalid filter field name" };

    if (!Array.isArray(f.values) || f.values.length === 0)
      return { valid: false, error: "Invalid filter values" };

    if (f.field === CONTACT_INCOMPLETE_FIELD) {
      if (
        f.values.length !== 1 ||
        f.values[0] !== CONTACT_INCOMPLETE_FILTER_VALUE
      ) {
        return { valid: false, error: "Invalid contact_incomplete filter" };
      }
    } else if (f.field === "cohorts") {
      const invalid = f.values.some(
        (v) => typeof v !== "string" || (v as string).trim() === ""
      );
      if (invalid)
        return { valid: false, error: "Invalid training filter values" };
    } else {
      const invalid = f.values.some((v) => typeof v !== "string");
      if (invalid)
        return { valid: false, error: "Invalid general or role filter values" };
    }

    cleanedFiltersList.push(f);
  }

  return { valid: true, cleanedFiltersList };
}

async function filterIdsByRolesTextSearch(
  client: SupabaseClient<Database>,
  op: string,
  patterns: string[],
  roleType: string
): Promise<Set<number>> {
  const trimmed = patterns.map((p) => p.trim()).filter((p) => p.length > 0);
  if (trimmed.length === 0) return new Set<number>();

  const { data, error } = await client
    .from("VolunteerRoles")
    .select("volunteer_id, Roles!inner(name, type)")
    .eq("Roles.type", roleType);

  if (error) throw error;

  const mappedRoles = new Map<number, Set<string>>();
  for (const row of data ?? []) {
    const name = row.Roles?.name;
    if (!name) continue;
    const vid = row.volunteer_id;
    if (!mappedRoles.has(vid)) mappedRoles.set(vid, new Set());
    mappedRoles.get(vid)?.add(name);
  }

  const nameMatchesPattern = (names: Set<string>, pattern: string): boolean => {
    const low = pattern.toLowerCase();
    for (const n of names) {
      if (n.toLowerCase().includes(low)) return true;
    }
    return false;
  };

  const validIds = new Set<number>();
  for (const [id, names] of mappedRoles) {
    if (op === OP.OR) {
      if (trimmed.some((p) => nameMatchesPattern(names, p))) validIds.add(id);
    } else if (trimmed.every((p) => nameMatchesPattern(names, p))) {
      validIds.add(id);
    }
  }
  return validIds;
}

function ilikeSubstringPattern(term: string): string {
  return `%${term}%`;
}

/** True when value is null/undefined or only whitespace (matches table “empty” display). */
function isBlankText(value: string | null | undefined): boolean {
  return (value ?? "").trim() === "";
}

async function filterIdsBlankTextField(
  client: SupabaseClient<Database>,
  field: string
): Promise<Set<number>> {
  if (field === "email") {
    const { data, error } = await client.from("Volunteers").select("id, email");
    if (error) throw error;
    const ids = new Set<number>();
    for (const r of data ?? []) {
      if (isBlankText(r.email)) ids.add(r.id);
    }
    return ids;
  }
  if (field === "phone") {
    const { data, error } = await client.from("Volunteers").select("id, phone");
    if (error) throw error;
    const ids = new Set<number>();
    for (const r of data ?? []) {
      if (isBlankText(r.phone)) ids.add(r.id);
    }
    return ids;
  }

  const [nullRows, emptyRows] = await Promise.all([
    client.from("Volunteers").select("id").is(field, null),
    client.from("Volunteers").select("id").eq(field, ""),
  ]);
  if (nullRows.error) throw nullRows.error;
  if (emptyRows.error) throw emptyRows.error;
  const ids = new Set<number>();
  for (const r of nullRows.data ?? []) ids.add(r.id);
  for (const r of emptyRows.data ?? []) ids.add(r.id);
  return ids;
}

/** Volunteers missing email and/or phone (null, empty, or whitespace-only). */
async function filterIdsContactIncomplete(
  client: SupabaseClient<Database>
): Promise<Set<number>> {
  const { data, error } = await client
    .from("Volunteers")
    .select("id, email, phone");
  if (error) throw error;
  const ids = new Set<number>();
  for (const row of data ?? []) {
    if (isBlankText(row.email) || isBlankText(row.phone)) {
      ids.add(row.id);
    }
  }
  return ids;
}

async function filterIdsByGeneral(
  client: SupabaseClient<Database>,
  field: string,
  op: string,
  values: string[]
): Promise<Set<number>> {
  const uniqueValues = Array.from(new Set(values));
  if (uniqueValues.length === 0) return new Set<number>();

  let query = client.from("Volunteers").select("id");

  if (TEXT_SUBSTRING_MATCH_FIELDS.has(field)) {
    if (
      uniqueValues.length === 1 &&
      uniqueValues[0] === BLANK_FIELD_FILTER_VALUE
    ) {
      return filterIdsBlankTextField(client, field);
    }

    const patterns = values.map((v) => ilikeSubstringPattern(v));
    if (op === OP.OR) {
      if (patterns.length === 1) {
        const p = patterns[0];
        if (p === undefined) return new Set<number>();
        query = query.ilike(field, p);
      } else {
        query = query.ilikeAnyOf(field, patterns);
      }
    } else {
      const uniquePatterns = Array.from(
        new Set(values.map((v) => ilikeSubstringPattern(v)))
      );
      if (uniquePatterns.length > 1) {
        query = query.ilikeAllOf(field, uniquePatterns);
      } else {
        const p = uniquePatterns[0];
        if (p === undefined) return new Set<number>();
        query = query.ilike(field, p);
      }
    }
  } else if (op === OP.OR) {
    query = query.in(field, values);
  } else {
    // AND on non–substring fields: exact match only (one value)
    if (uniqueValues.length > 1) return new Set<number>();
    const value = uniqueValues[0];
    if (value === undefined) return new Set<number>();
    query = query.eq(field, value);
  }

  const { data, error } = await query;

  if (error) throw error;

  return new Set(data.map((r) => r.id));
}
