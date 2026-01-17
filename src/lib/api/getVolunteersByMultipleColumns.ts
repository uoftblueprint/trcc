import { createClient } from "../client/supabase/server";
import type { Database } from "../client/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const OP = {
  AND: "AND",
  OR: "OR",
} as const;

const VALID_COHORT_TERM_REGEX = /^(Fall|Spring|Summer|Winter)$/i;

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
  "roles",
  "cohorts",
];

export type FilterTuple = {
  field: string;
  miniOp: "AND" | "OR";
  values: string[] | [string, string][];
};

type ValidationResult =
  | { valid: true; cleanedFiltersList: FilterTuple[] }
  | { valid: false; error: string };

type VolunteerRow = Database["public"]["Tables"]["Volunteers"]["Row"];

type VolunteerFilterResponse =
  | { status: 200; data: VolunteerRow[]; error?: never }
  | { status: 400 | 500; data?: never; error: string };

export function validateMultipleColumnFilter(
  filtersList: FilterTuple[],
  op: string
): ValidationResult {
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

    if (f.field === "cohorts") {
      const invalid = f.values.some(
        (v) =>
          !Array.isArray(v) ||
          v.length !== 2 ||
          typeof v[0] !== "string" ||
          !VALID_COHORT_TERM_REGEX.test(v[0]) ||
          typeof v[1] !== "string" ||
          isNaN(parseInt(v[1])) ||
          !(1900 <= parseInt(v[1]) && parseInt(v[1]) <= 2100)
      );

      if (invalid)
        return { valid: false, error: "Invalid cohort filter values" };
    } else {
      const invalid = f.values.some((v) => typeof v !== "string");
      if (invalid)
        return { valid: false, error: "Invalid general or role filter values" };
    }

    cleanedFiltersList.push(f);
  }

  return { valid: true, cleanedFiltersList };
}

function filterMatchingIds(
  mappedData: Map<number, Set<string>>,
  op: string,
  targetValues: string[]
): Set<number> {
  const validIds = new Set<number>();

  for (const [id, foundItems] of mappedData) {
    if (op === OP.OR || targetValues.every((v) => foundItems.has(v))) {
      validIds.add(id);
    }
  }
  return validIds;
}

async function filterIdsByRoles(
  client: SupabaseClient<Database>,
  op: string,
  values: string[]
): Promise<Set<number>> {
  const { data, error } = await client
    .from("VolunteerRoles")
    .select("volunteer_id, Roles!inner(name)")
    .in("Roles.name", values);

  if (error) throw error;

  const mappedRoles = new Map<number, Set<string>>();
  for (const role of data) {
    if (!mappedRoles.has(role.volunteer_id))
      mappedRoles.set(role.volunteer_id, new Set());
    mappedRoles.get(role.volunteer_id)?.add(role.Roles.name);
  }

  return filterMatchingIds(mappedRoles, op, values);
}

async function filterIdsByCohorts(
  client: SupabaseClient<Database>,
  op: string,
  values: [string, string][]
): Promise<Set<number>> {
  const orCondition = values
    .map((v) => `and(term.eq.${v[0]},year.eq.${v[1]})`)
    .join(",");

  const { data, error } = await client
    .from("VolunteerCohorts")
    .select("volunteer_id, Cohorts!inner(term, year)")
    .or(orCondition, { referencedTable: "Cohorts" });

  if (error) throw error;

  const mappedCohorts = new Map<number, Set<string>>();
  for (const cohort of data) {
    const key = `${cohort.Cohorts.term}-${cohort.Cohorts.year}`;
    if (!mappedCohorts.has(cohort.volunteer_id))
      mappedCohorts.set(cohort.volunteer_id, new Set());
    mappedCohorts.get(cohort.volunteer_id)?.add(key);
  }

  const targetValues = values.map((v) => `${v[0]}-${v[1]}`);

  return filterMatchingIds(mappedCohorts, op, targetValues);
}

async function filterIdsByGeneral(
  client: SupabaseClient<Database>,
  field: string,
  op: string,
  values: string[]
): Promise<Set<number>> {
  let query = client.from("Volunteers").select("id");

  if (op === OP.OR) {
    query = query.in(field, values);
  } else {
    const uniqueValues = Array.from(new Set(values));

    if (uniqueValues.length > 1) return new Set<number>();

    const value = uniqueValues[0];
    if (value === undefined) return new Set<number>();

    query = query.eq(field, value);
  }

  const { data, error } = await query;

  if (error) throw error;

  return new Set(data.map((r) => r.id));
}

/**
 * Returns a filtered list of volunteer ids based on a list filters.
 *
 * The function allows filtering by roles, cohorts, or by a general attribute
 * of a volunteer, with AND/OR logic for each filter.
 *
 * @param filtersList - An array of filter tuples. Each tuple contains:
 * - field: The general attribute, 'roles', or 'cohorts'.
 * - miniOp: The operation to apply ('AND'/'OR').
 * - values: The array of values to filter by.
 * @param op - The global operation on the filters ('AND'/'OR').
 *
 * @returns A Promise resolving to an object containing:
 * - status: HTTP status code.
 * - data: Volunteer rows.
 * - error: Error message.
 */
export async function getVolunteersByMultipleColumns(
  filtersList: FilterTuple[],
  op: string
): Promise<VolunteerFilterResponse> {
  const validation = validateMultipleColumnFilter(filtersList, op);
  if (!validation.valid) {
    return { status: 400, error: validation.error };
  }

  const cleanFiltersList = validation.cleanedFiltersList;

  const client = await createClient();

  if (cleanFiltersList.length === 0) {
    return { status: 200, data: [] };
  }

  try {
    const promises = cleanFiltersList.map(async (f) => {
      if (f.field === "roles") {
        return filterIdsByRoles(client, f.miniOp, f.values as string[]);
      } else if (f.field === "cohorts") {
        return filterIdsByCohorts(
          client,
          f.miniOp,
          f.values as [string, string][]
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

    if (finalIds.size === 0) return { status: 200, data: [] };

    const { data, error } = await client
      .from("Volunteers")
      .select("*")
      .in("id", Array.from(finalIds));

    if (error) throw error;

    return { status: 200, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { status: 500, error: message };
  }
}
