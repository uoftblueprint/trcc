// Tests the API function that removes a cohort from the database

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createServiceTestClient,
  deleteWhere,
  deleteWhereGte,
} from "../support/helpers";
import {
  makeTestVolunteerInsert,
  makeTestCohortInsert,
  makeTestVolunteerCohortInsert,
  TEST_YEAR,
} from "../support/factories";
import { removeCohort } from "@/lib/api/removeCohort";

describe("removeCohort (integration)", () => {
  const client = createServiceTestClient();

  // Cleanup before and after each test
  beforeEach(async () => {
    // Clean junction tables first, then parent tables
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  describe("successful deletion", () => {
    it("removes a cohort by year and term and returns success", async () => {
      // Create a cohort
      await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }));

      // Remove the cohort
      const result = await removeCohort(TEST_YEAR, "Fall");

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify the cohort no longer exists
      const { data } = await client
        .from("Cohorts")
        .select()
        .eq("year", TEST_YEAR)
        .eq("term", "Fall");

      expect(data).toHaveLength(0);
    });

    it("cascades delete to VolunteerCohorts junction table", async () => {
      // Create a cohort
      const { data: cohort } = await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }))
        .select()
        .single();

      // Create a volunteer
      const { data: volunteer } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_Cascade" }))
        .select()
        .single();

      // Link the volunteer to the cohort
      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(volunteer!.id, cohort!.id));

      // Verify the junction record exists
      const { data: beforeDelete } = await client
        .from("VolunteerCohorts")
        .select()
        .eq("cohort_id", cohort!.id);

      expect(beforeDelete).toHaveLength(1);

      // Remove the cohort
      const result = await removeCohort(TEST_YEAR, "Fall");

      expect(result.success).toBe(true);

      // Verify the junction record was cascaded
      const { data: afterDelete } = await client
        .from("VolunteerCohorts")
        .select()
        .eq("cohort_id", cohort!.id);

      expect(afterDelete).toHaveLength(0);

      // Verify the volunteer still exists
      const { data: volunteerAfter } = await client
        .from("Volunteers")
        .select()
        .eq("id", volunteer!.id);

      expect(volunteerAfter).toHaveLength(1);
    });
  });

  describe("cohort not found", () => {
    it("returns failure when cohort with year and term does not exist", async () => {
      const result = await removeCohort(9999, "Fall");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Cohort with year 9999 and term Fall not found"
      );
    });

    it("returns failure when year matches but term does not", async () => {
      // Create a cohort with a specific term
      await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }));

      // Try to remove with different term
      const result = await removeCohort(TEST_YEAR, "Spring");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        `Cohort with year ${TEST_YEAR} and term Spring not found`
      );

      // Verify the original cohort still exists
      const { data } = await client
        .from("Cohorts")
        .select()
        .eq("year", TEST_YEAR)
        .eq("term", "Fall");

      expect(data).toHaveLength(1);
    });

    it("returns failure when term matches but year does not", async () => {
      // Create a cohort with a specific year
      await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }));

      // Try to remove with different year
      const result = await removeCohort(TEST_YEAR + 1, "Fall");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        `Cohort with year ${TEST_YEAR + 1} and term Fall not found`
      );

      // Verify the original cohort still exists
      const { data } = await client
        .from("Cohorts")
        .select()
        .eq("year", TEST_YEAR)
        .eq("term", "Fall");

      expect(data).toHaveLength(1);
    });
  });

  describe("return value structure", () => {
    it("returns success: true with no error property on successful deletion", async () => {
      await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }));

      const result = await removeCohort(TEST_YEAR, "Fall");

      expect(result).toEqual({ success: true });
      expect("error" in result).toBe(false);
    });

    it("returns success: false with error message on failure", async () => {
      const result = await removeCohort(9999, "NonExistent");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    });
  });
});
