import type { Database } from "@/lib/client/supabase/types";

export type CohortInsert = Database["public"]["Tables"]["Cohorts"]["Insert"];

function randomToken(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function uniqueTestId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

// Factory function for creating test cohort inserts
export function makeTestCohortInsert(
  overrides: Partial<CohortInsert> = {}
): CohortInsert {
  const token = randomToken();
  return {
    id: overrides.id ?? uniqueTestId(),
    term: overrides.term ?? `TEST_${token}`,
    year: overrides.year ?? 2099,
    is_active: overrides.is_active ?? false,
    ...overrides,
  };
}
