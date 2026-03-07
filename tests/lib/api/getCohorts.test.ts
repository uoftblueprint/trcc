// Tests the API function that fetches all cohorts from the Cohorts table

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceTestClient, deleteWhereGte } from "../support/helpers";
import { makeTestCohortInsert, TEST_YEAR } from "../support/factories";
import { getCohorts } from "@/lib/api/getCohorts";
import type { Database } from "@/lib/client/supabase/types";

type CohortRow = Database["public"]["Tables"]["Cohorts"]["Row"];

describe("getCohorts (integration)", () => {
  const client = createServiceTestClient();

  beforeEach(async () => {
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  it("returns an array", async () => {
    const result = await getCohorts();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns all inserted test cohorts", async () => {
    const cohort1 = makeTestCohortInsert({ term: "Fall", year: TEST_YEAR });
    const cohort2 = makeTestCohortInsert({ term: "Spring", year: TEST_YEAR });

    const { error: err1 } = await client.from("Cohorts").insert(cohort1);
    expect(err1).toBeNull();

    const { error: err2 } = await client.from("Cohorts").insert(cohort2);
    expect(err2).toBeNull();

    const result = await getCohorts();

    const testCohorts = result.filter((c) => c.year === TEST_YEAR);
    const terms = testCohorts.map((c) => c.term);
    expect(terms).toContain("Fall");
    expect(terms).toContain("Spring");
  });

  it("returns CohortRow objects with correct properties", async () => {
    const cohortInsert = makeTestCohortInsert({
      term: "Summer",
      year: TEST_YEAR,
      is_active: false,
    });

    const { data: inserted, error } = await client
      .from("Cohorts")
      .insert(cohortInsert)
      .select()
      .single();

    expect(error).toBeNull();
    expect(inserted).toBeTruthy();

    const result = await getCohorts();
    const found = result.find((c) => c.id === inserted!.id);

    expect(found).toBeTruthy();
    const cohort = found as CohortRow;
    expect(cohort).toHaveProperty("id");
    expect(cohort).toHaveProperty("term", "Summer");
    expect(cohort).toHaveProperty("year", TEST_YEAR);
    expect(cohort).toHaveProperty("is_active", false);
    expect(cohort).toHaveProperty("created_at");
    expect(typeof cohort.id).toBe("number");
    expect(typeof cohort.created_at).toBe("string");
  });

  it("includes cohorts of all valid terms", async () => {
    const cohortFall = makeTestCohortInsert({ term: "Fall", year: TEST_YEAR });
    const cohortSpring = makeTestCohortInsert({
      term: "Spring",
      year: TEST_YEAR,
    });
    const cohortSummer = makeTestCohortInsert({
      term: "Summer",
      year: TEST_YEAR,
    });
    const cohortWinter = makeTestCohortInsert({
      term: "Winter",
      year: TEST_YEAR,
    });

    await client.from("Cohorts").insert(cohortFall);
    await client.from("Cohorts").insert(cohortSpring);
    await client.from("Cohorts").insert(cohortSummer);
    await client.from("Cohorts").insert(cohortWinter);

    const result = await getCohorts();
    const testTerms = result
      .filter((c) => c.year === TEST_YEAR)
      .map((c) => c.term);

    expect(testTerms).toContain("Fall");
    expect(testTerms).toContain("Spring");
    expect(testTerms).toContain("Summer");
    expect(testTerms).toContain("Winter");
  });

  it("includes both active and inactive cohorts", async () => {
    const activeCohort = makeTestCohortInsert({
      term: "Fall",
      year: TEST_YEAR,
      is_active: true,
    });
    const inactiveCohort = makeTestCohortInsert({
      term: "Spring",
      year: TEST_YEAR,
      is_active: false,
    });

    await client.from("Cohorts").insert(activeCohort);
    await client.from("Cohorts").insert(inactiveCohort);

    const result = await getCohorts();
    const testCohorts = result.filter((c) => c.year === TEST_YEAR);

    const active = testCohorts.find((c) => c.term === "Fall");
    const inactive = testCohorts.find((c) => c.term === "Spring");

    expect(active).toBeTruthy();
    expect(active!.is_active).toBe(true);
    expect(inactive).toBeTruthy();
    expect(inactive!.is_active).toBe(false);
  });

  it("reflects a newly inserted cohort", async () => {
    const before = await getCohorts();
    const countBefore = before.length;

    const newCohort = makeTestCohortInsert({
      term: "Fall",
      year: TEST_YEAR,
    });
    const { error } = await client.from("Cohorts").insert(newCohort);
    expect(error).toBeNull();

    const after = await getCohorts();
    expect(after.length).toBe(countBefore + 1);
    expect(
      after.filter((c) => c.year === TEST_YEAR).map((c) => c.term)
    ).toContain("Fall");
  });

  it("does not include a deleted cohort", async () => {
    const cohortInsert = makeTestCohortInsert({
      term: "Fall",
      year: TEST_YEAR,
    });
    const { data: inserted, error: insertErr } = await client
      .from("Cohorts")
      .insert(cohortInsert)
      .select()
      .single();

    expect(insertErr).toBeNull();
    expect(inserted).toBeTruthy();

    const { error: deleteErr } = await client
      .from("Cohorts")
      .delete()
      .eq("id", inserted!.id);
    expect(deleteErr).toBeNull();

    const result = await getCohorts();
    const found = result.find((c) => c.id === inserted!.id);
    expect(found).toBeUndefined();
  });
});
