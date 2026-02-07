import { createClient } from "@/lib/client/supabase";

/**
 * Removes a cohort from the database by year and term.
 *
 * @param year - The cohort year (e.g., 2025)
 * @param term - The cohort term (e.g., "Fall", "Spring", "Summer", "Winter")
 *
 * @returns A Promise resolving to a response object indicating success or failure.
 *   - On success: { success: true }
 *   - On failure: { success: false, error: string }
 *
 * @example
 * // Remove the Fall 2025 cohort
 * const result = await removeCohort(2025, "Fall");
 * if (result.success) {
 *   console.log("Cohort deleted successfully");
 * }
 */
type RemoveCohortResponse =
  | { success: true; error?: never }
  | { success: false; error: string };

export async function removeCohort(
  year: number,
  term: string
): Promise<RemoveCohortResponse> {
  const client = await createClient();

  try {
    const { data, error } = await client
      .from("Cohorts")
      .delete()
      .eq("year", year)
      .eq("term", term)
      .select();

    if (error) throw error;

    // No cohort with that year and term was found
    if (data.length === 0) {
      return {
        success: false,
        error: `Cohort with year ${year} and term ${term} not found`,
      };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { success: false, error: message };
  }
}
