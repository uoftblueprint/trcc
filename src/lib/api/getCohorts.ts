"use server";

import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";

type CohortRow = Database["public"]["Tables"]["Cohorts"]["Row"];

/**
 * Fetches all cohorts from the Cohorts database table.
 *
 * @returns A Promise resolving to an array of CohortRow objects containing all cohorts.
 *   Each cohort object contains all columns defined in the `Cohorts` table (i.e. a full `CohortRow`).
 *
 * @throws Error if the Supabase query fails
 *
 * @example
 * const cohorts = await getCohorts();
 * // [
 * //   { year: 2025, term: "Fall", is_active: true, created_at: "...", id: 1 },
 * //   { year: 2025, term: "Spring", is_active: false, created_at: "...", id: 2 },
 * //   ...
 * // ]
 */
export async function getCohorts(): Promise<CohortRow[]> {
  const client = await createClient();

  const { data: cohorts, error } = await client.from("Cohorts").select();

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  return (cohorts as CohortRow[]) || [];
}
