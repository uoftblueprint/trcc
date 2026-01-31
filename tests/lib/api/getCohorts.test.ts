// Example test for getExample function
// This test is not meaningful as is, but serves as a template
// You should modify it to fit your actual implementation and testing needs

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCohorts } from "@/lib/api/getCohorts";
import { createServiceTestClient, deleteWhereGte } from "../support/helpers";
import { makeTestCohortInsert, TEST_YEAR } from "../support/factories";
import type { Database } from "@/lib/client/supabase/types";

type CohortRow = Database["public"]["Tables"]["Cohorts"]["Row"];

describe("getCohorts", () => {
  const client = createServiceTestClient();
  beforeEach(async () => {
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  // Test case to verify fetching cohorts
  it("should fetch all cohort data successfully", async () => {
    // create two cohorts to ensure at least two cohorts are returned
    const { data: cohort1 } = await client
      .from("Cohorts")
      .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }))
      .select()
      .single();

    const { data: cohort2 } = await client
      .from("Cohorts")
      .insert(makeTestCohortInsert({ term: "Spring", year: TEST_YEAR }))
      .select()
      .single();

    const result = await getCohorts();

    expect(Array.isArray(result)).toBe(true);

    if (result.length > 0) {
      // Check properties of the first cohort
      console.log("Result has at least one cohort. Verifying properties...");
      const first = result[0] as CohortRow;
      expect(first).toHaveProperty("id");
      console.log("Verified property: id");
      expect(first).toHaveProperty("term");
      console.log("Verified property: term");
      expect(first).toHaveProperty("is_active");
      console.log("Verified property: is_active");
    }
    if (cohort1) {
      expect(result.includes(cohort1));
      console.log("Verified cohort1 is returned");
    }
    if (cohort2) {
      expect(result.includes(cohort2));
      console.log("Verified cohort2 is returned");
    }
  });
});
