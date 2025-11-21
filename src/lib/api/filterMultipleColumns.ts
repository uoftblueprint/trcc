import { createClient } from "../client/supabase/server";
import type { Database } from "../client/supabase/types";

export type FilterTuple = {
  mini_op: string;
  field: string;
  values: string[];
};

export type VolunteerRow = Database["public"]["Tables"]["Volunteers"]["Row"];

export type VolunteerFilterResponse =
  | { data: VolunteerRow[]; error?: string }
  | { data?: VolunteerRow[]; error: string };

const VOLUNTEER_COLUMNS = [
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
];
const ALLOWED_FIELDS = [...VOLUNTEER_COLUMNS, "roles", "cohorts"];

export function validateFilter(
  filtersList: FilterTuple[],
  op: string
): {
  valid: boolean;
  error?: string;
} {
  if (!Array.isArray(filtersList))
    return { valid: false, error: "'filter' must be an array" };

  // Allow filter to be an empty array

  for (const f of filtersList) {
    if (!f.mini_op || !(f.mini_op == "AND" || f.mini_op == "OR"))
      return { valid: false, error: "Invalid filter mini-operation" };

    if (!f.field || !ALLOWED_FIELDS.includes(f.field.toLowerCase()))
      return { valid: false, error: "Invalid filter field" };

    if (!Array.isArray(f.values) || f.values.length === 0)
      return { valid: false, error: "Invalid filter values" };

    // Cohort values must be in the form (term, year)
    if (f.field.toLowerCase() === "cohorts") {
      const invalid = f.values.some(
        (v) =>
          !Array.isArray(v) ||
          v.length !== 2 ||
          typeof v[0] !== "string" ||
          !/^(Fall|Spring|Summer|Winter)$/i.test(v[0]) ||
          typeof v[1] !== "string" ||
          isNaN(parseInt(v[1]))
      );

      if (invalid)
        return { valid: false, error: "Invalid cohort filter values" };
    }
  }

  if (!op || !(op === "AND" || op === "OR"))
    return { valid: false, error: "Invalid global operation" };

  return { valid: true };
}

export async function filterMultipleColumns(
  filtersList: FilterTuple[],
  op: string
): Promise<VolunteerFilterResponse> {
  const client = await createClient();

  const querySets: Set<number>[] = [];

  // Return all volunteers when no filters inputted
  if (filtersList.length === 0) {
    const { data, error } = await client.from("Volunteers").select("*");

    if (error) return { error: error.message };

    return { data };
  }

  for (const { field, values, mini_op } of filtersList) {
    let volunteerIds: number[] = [];

    const filterField = field.toLowerCase();

    if (filterField === "roles") {
      // Role-specific filtering
      let query = client
        .from("VolunteerRoles")
        .select("volunteer_id, Roles!inner(name)");

      if (mini_op === "OR") {
        query = query.in("Roles.name", values);
      } else {
        values.forEach((v) => {
          query = query.eq("Roles.name", v);
        });
      }

      const { data: roleRows, error } = await query;
      if (error) return { error: error.message };

      volunteerIds = roleRows.map((r) => r.volunteer_id);
    } else if (filterField === "cohorts") {
      // Cohort-specific filtering
      let query = client
        .from("VolunteerCohorts")
        .select("volunteer_id, Cohorts!inner(term, year)");

      if (mini_op === "OR") {
        const orStatement = values
          .map((v) => `and(term.eq.${v[0]},year.eq.${v[1]})`)
          .join(",");
        query = query.or(orStatement, { referencedTable: "Cohorts" });
      } else {
        values.forEach((v) => {
          query = query
            .eq("Cohorts.term", v[0])
            .eq("Cohorts.year", parseInt(v[1]));
        });
      }

      const { data: cohortRows, error } = await query;
      if (error) return { error: error.message };

      volunteerIds = cohortRows.map((r) => r.volunteer_id);
    } else {
      // General filtering
      let query = client.from("Volunteers").select("id");

      if (mini_op === "OR") {
        query = query.in(filterField, values);
      } else {
        values.forEach((v) => {
          query = query.eq(filterField, v);
        });
      }

      const { data: volunteerRows, error } = await query;
      if (error) return { error: error.message };

      volunteerIds = volunteerRows.map((r) => r.id);
    }

    querySets.push(new Set(volunteerIds));
  }

  let finalIds: Set<number>;

  if (querySets.length === 0) return { data: [] };

  // Combined queried volunteer ids based on global op
  if (op === "AND") {
    finalIds = querySets.reduce((acc, cur) => {
      return acc.intersection(cur);
    });
  } else {
    finalIds = querySets.reduce((acc, cur) => {
      return acc.union(cur);
    });
  }

  const { data, error } = await client
    .from("Volunteers")
    .select("*")
    .in("id", [...finalIds]);

  if (error) return { error: error.message };

  return { data };
}
