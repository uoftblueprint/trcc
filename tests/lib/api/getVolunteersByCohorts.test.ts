// Integration tests for getVolunteersByCohorts function
// Tests the API function that filters volunteers by their cohort assignments

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
import { getVolunteersByCohorts } from "@/lib/api/getVolunteersByCohorts";

describe("getVolunteersByCohorts (integration)", () => {
  const client = createServiceTestClient();

  // Cleanup before and after each test
  beforeEach(async () => {
    // Clean junction tables first (handled by CASCADE), then parent tables
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  describe("input validation", () => {
    it("returns empty array when values array is empty", async () => {
      const result = await getVolunteersByCohorts("OR", []);
      expect(result).toEqual([]);
    });

    it("returns empty array when no cohorts match the filter", async () => {
      const result = await getVolunteersByCohorts("OR", [
        ["Fall", "9999"],
        ["Spring", "9998"],
      ]);
      expect(result).toEqual([]);
    });
  });

  describe("OR operator", () => {
    it("returns volunteers matching ANY of the specified cohorts", async () => {
      // Create two cohorts
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

      // Create three volunteers
      const { data: vol1 } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol1_Fall" }))
        .select()
        .single();

      const { data: vol2 } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol2_Spring" }))
        .select()
        .single();

      await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol3_NoMatch" }));

      // Link vol1 to Fall, vol2 to Spring
      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol1!.id, cohort1!.id));

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol2!.id, cohort2!.id));

      // Query with OR - should return both vol1 and vol2
      const result = await getVolunteersByCohorts("OR", [
        ["Fall", String(TEST_YEAR)],
        ["Spring", String(TEST_YEAR)],
      ]);

      expect(result).toHaveLength(2);
      const names = result.map((v) => v.name_org);
      expect(names).toContain("TEST_Vol1_Fall");
      expect(names).toContain("TEST_Vol2_Spring");
      expect(names).not.toContain("TEST_Vol3_NoMatch");
    });

    it("returns volunteer only once even if they match multiple cohorts", async () => {
      // Create two cohorts
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

      // Create volunteer in BOTH cohorts
      const { data: vol } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_Both" }))
        .select()
        .single();

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol!.id, cohort1!.id));

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol!.id, cohort2!.id));

      // Query with OR
      const result = await getVolunteersByCohorts("OR", [
        ["Fall", String(TEST_YEAR)],
        ["Spring", String(TEST_YEAR)],
      ]);

      // Should return the volunteer only once
      expect(result).toHaveLength(1);
      expect(result[0].name_org).toBe("TEST_Vol_Both");
    });
  });

  describe("AND operator", () => {
    it("returns only volunteers matching ALL specified cohorts", async () => {
      // Create two cohorts
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

      // Create volunteer in BOTH cohorts
      const { data: volBoth } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_Both" }))
        .select()
        .single();

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(volBoth!.id, cohort1!.id));

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(volBoth!.id, cohort2!.id));

      // Create volunteer in only ONE cohort
      const { data: volOne } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_FallOnly" }))
        .select()
        .single();

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(volOne!.id, cohort1!.id));

      // Query with AND - should only return volBoth
      const result = await getVolunteersByCohorts("AND", [
        ["Fall", String(TEST_YEAR)],
        ["Spring", String(TEST_YEAR)],
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].name_org).toBe("TEST_Vol_Both");
    });

    it("returns empty array if a specified cohort does not exist", async () => {
      // Create only one cohort
      const { data: cohort } = await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }))
        .select()
        .single();

      // Create volunteer in that cohort
      const { data: vol } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_Fall" }))
        .select()
        .single();

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol!.id, cohort!.id));

      // Query with AND including non-existent cohort
      const result = await getVolunteersByCohorts("AND", [
        ["Fall", String(TEST_YEAR)],
        ["Winter", "9999"], // Does not exist
      ]);

      expect(result).toEqual([]);
    });

    it("returns empty array when no volunteers match all cohorts", async () => {
      // Create two cohorts
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

      // Create two separate volunteers, each in only one cohort
      const { data: vol1 } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_Fall" }))
        .select()
        .single();

      const { data: vol2 } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_Spring" }))
        .select()
        .single();

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol1!.id, cohort1!.id));

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol2!.id, cohort2!.id));

      // Query with AND - no volunteer is in BOTH
      const result = await getVolunteersByCohorts("AND", [
        ["Fall", String(TEST_YEAR)],
        ["Spring", String(TEST_YEAR)],
      ]);

      expect(result).toEqual([]);
    });
  });

  describe("return value structure", () => {
    it("returns VolunteerRow objects with correct properties", async () => {
      // Create a cohort
      const { data: cohort } = await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }))
        .select()
        .single();

      // Create a volunteer with specific data
      const { data: vol } = await client
        .from("Volunteers")
        .insert(
          makeTestVolunteerInsert({
            name_org: "TEST_Vol_Properties",
            email: "test_props@example.com",
            position: "volunteer",
          })
        )
        .select()
        .single();

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol!.id, cohort!.id));

      const result = await getVolunteersByCohorts("OR", [
        ["Fall", String(TEST_YEAR)],
      ]);

      expect(result).toHaveLength(1);

      const volunteer = result[0];
      expect(volunteer).toHaveProperty("id");
      expect(volunteer).toHaveProperty("name_org", "TEST_Vol_Properties");
      expect(volunteer).toHaveProperty("email", "test_props@example.com");
      expect(volunteer).toHaveProperty("position", "volunteer");
      expect(volunteer).toHaveProperty("created_at");
      expect(volunteer).toHaveProperty("updated_at");
    });
  });
});
