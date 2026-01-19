/**
 * Fetches volunteers filtered by their cohort assignments.
 *
 * @param op - The logical operator to combine cohort filters:
 *   - "AND": Returns volunteers that belong to ALL specified cohorts
 *   - "OR": Returns volunteers that belong to ANY of the specified cohorts
 *
 * @param values - An array of cohort filter tuples, where each tuple is [term, year]:
 *   - term: The cohort term (e.g., "Fall", "Spring", "Summer", "Winter")
 *   - year: The cohort year as a string (e.g., "2025", "2023")
 *   Example: [["Fall", "2025"], ["Spring", "2023"]]
 *
 * @returns A Promise resolving to an array of VolunteerRow objects that match the filter criteria.
 *   - For "OR": Returns volunteers in at least one of the specified cohorts
 *   - For "AND": Returns only volunteers present in ALL specified cohorts
 *   - Returns an empty array if no volunteers match or if values array is empty
 *
 * @throws Error if the Supabase query fails or if an invalid operator is provided
 *
 * @example
 * // Get volunteers in Fall 2025 OR Spring 2023
 * const volunteers = await getVolunteersByCohorts("OR", [["Fall", "2025"], ["Spring", "2023"]]);
 *
 * @example
 * // Get volunteers in BOTH Fall 2025 AND Spring 2023
 * const volunteers = await getVolunteersByCohorts("AND", [["Fall", "2025"], ["Spring", "2023"]]);
 */
import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";

type VolunteerRow = Database["public"]["Tables"]["Volunteers"]["Row"];
type CohortValue = [string, string]; // [term, year]

export async function getVolunteersByCohorts(
  op: "AND" | "OR",
  values: CohortValue[]
): Promise<VolunteerRow[]> {
  // Validate operator
  if (op !== "AND" && op !== "OR") {
    throw new Error(`Invalid operator: ${op}. Must be "AND" or "OR".`);
  }

  // Return empty array if no filter values provided
  if (!values || values.length === 0) {
    return [];
  }

  // Initialize Supabase client
  const client = await createClient();

  // First, find all cohort IDs that match the given (term, year) pairs
  const cohortIds: number[] = [];

  for (const [term, year] of values) {
    const parsedYear = parseInt(year, 10);
    // If year is not a valid number, treat it as "no match" rather than querying with NaN
    if (Number.isNaN(parsedYear)) {
      if (op === "AND") return [];
      continue;
    }

    const { data: cohortData, error: cohortError } = await client
      .from("Cohorts")
      .select("id")
      .eq("term", term)
      .eq("year", parsedYear)
      .single();

    if (cohortError) {
      // If cohort not found, skip it (for OR) or return empty (for AND)
      if (cohortError.code === "PGRST116") {
        if (op === "AND") {
          // If any cohort doesn't exist in AND mode, no volunteers can match all
          return [];
        }
        continue;
      }
      throw new Error(cohortError.message || JSON.stringify(cohortError));
    }

    if (cohortData) {
      cohortIds.push(cohortData.id);
    }
  }

  // If no valid cohorts found, return empty array
  if (cohortIds.length === 0) {
    return [];
  }

  if (op === "OR") {
    // OR: Get all volunteers that belong to any of the specified cohorts
    const { data: volunteerCohorts, error: vcError } = await client
      .from("VolunteerCohorts")
      .select("volunteer_id")
      .in("cohort_id", cohortIds);

    if (vcError) {
      throw new Error(vcError.message || JSON.stringify(vcError));
    }

    if (!volunteerCohorts || volunteerCohorts.length === 0) {
      return [];
    }

    // Get unique volunteer IDs
    const volunteerIds = [
      ...new Set(volunteerCohorts.map((vc) => vc.volunteer_id)),
    ];

    // Fetch the volunteer details
    const { data: volunteers, error: vError } = await client
      .from("Volunteers")
      .select()
      .in("id", volunteerIds);

    if (vError) {
      throw new Error(vError.message || JSON.stringify(vError));
    }

    return (volunteers as VolunteerRow[]) || [];
  } else {
    // AND: Get volunteers that belong to ALL specified cohorts
    const { data: volunteerCohorts, error: vcError } = await client
      .from("VolunteerCohorts")
      .select("volunteer_id, cohort_id")
      .in("cohort_id", cohortIds);

    if (vcError) {
      throw new Error(vcError.message || JSON.stringify(vcError));
    }

    if (!volunteerCohorts || volunteerCohorts.length === 0) {
      return [];
    }

    // Count how many of the required cohorts each volunteer belongs to
    const volunteerCohortCount = new Map<number, Set<number>>();

    for (const vc of volunteerCohorts) {
      if (!volunteerCohortCount.has(vc.volunteer_id)) {
        volunteerCohortCount.set(vc.volunteer_id, new Set());
      }
      volunteerCohortCount.get(vc.volunteer_id)!.add(vc.cohort_id);
    }

    // Filter to only volunteers that have ALL the required cohorts
    const matchingVolunteerIds = Array.from(volunteerCohortCount.entries())
      .filter(([, cohorts]) => cohorts.size === cohortIds.length)
      .map(([volunteerId]) => volunteerId);

    if (matchingVolunteerIds.length === 0) {
      return [];
    }

    // Fetch the volunteer details
    const { data: volunteers, error: vError } = await client
      .from("Volunteers")
      .select()
      .in("id", matchingVolunteerIds);

    if (vError) {
      throw new Error(vError.message || JSON.stringify(vError));
    }

    return (volunteers as VolunteerRow[]) || [];
  }
}
