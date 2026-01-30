import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import { makeTestCohortInsert, TEST_YEAR } from "../support/factories";
import { createCohort } from "../../../src/lib/api/createCohort";

describe("db: Cohorts createCohort (integration)", () => {
  let client: ReturnType<typeof createServiceTestClient>;

  beforeEach(async () => {
    client = createServiceTestClient();
    await deleteWhere(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhere(client, "Cohorts", "year", TEST_YEAR);
  });

  it("inserts a valid cohort", async () => {
    const cohort = makeTestCohortInsert();

    const result = await createCohort(cohort);

    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(TEST_YEAR);
    expect(result[0].term).toBe("Fall");
    expect(result[0].is_active).toBe(false);
  });

  it("throws if data is not an object", async () => {
    await expect(createCohort(null)).rejects.toThrow("Data must be an object");
  });

  it("throws if a required field is missing", async () => {
    const cohort = makeTestCohortInsert({ term: undefined });

    await expect(createCohort(cohort)).rejects.toThrow(
      "Field 'term' is required"
    );
  });

  it("throws if a field has the wrong type", async () => {
    const cohort = makeTestCohortInsert({
      year: "2026",
    });

    await expect(createCohort(cohort)).rejects.toThrow(
      "Field 'year' must be a number"
    );
  });

});
