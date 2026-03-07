import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateCohort } from "@/lib/api/updateCohort";
import * as supabaseClient from "@/lib/client/supabase";
import type { Tables } from "@/lib/client/supabase/types";
import { createServiceTestClient, deleteWhereGte } from "../support/helpers";
import { makeTestCohortInsert, TEST_YEAR } from "../support/factories";

const client = createServiceTestClient();

async function seedCohort(
  overrides: Partial<Tables<"Cohorts">> = {}
): Promise<Tables<"Cohorts">> {
  const insert = makeTestCohortInsert(overrides);
  const { data, error } = await client
    .from("Cohorts")
    .insert(insert)
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to seed cohort");
  }

  return data;
}

describe("updateCohort (unit)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid cohort id", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateCohort("bad-id", { name: "TEST_Name" });

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/invalid cohort id/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for non-object body", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateCohort(1, null);

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/json object/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown field", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateCohort(1, { unknown: "value" });

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/unknown field/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for empty patch object", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateCohort(1, {});

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/at least one updatable field/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid year", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateCohort(1, { year: "not_a_number" });

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/must be one of/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid is_active type", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateCohort(1, { is_active: "true" });

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/must be a boolean/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });
});

describe("updateCohort (integration)", () => {
  beforeEach(async () => {
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  it("updates a cohort and returns the updated object", async () => {
    const cohort = await seedCohort({
      term: "Fall",
      year: TEST_YEAR - 1,
      is_active: true,
    });

    const result = await updateCohort(cohort.id, {
      term: "Fall",
      year: TEST_YEAR,
      is_active: false,
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) return;

    expect(result.body.cohort.id).toBe(cohort.id);
    expect(result.body.cohort.term).toBe("Fall");
    expect(result.body.cohort.year).toBe(TEST_YEAR);
    expect(result.body.cohort.is_active).toBe(false);

    const { data: persisted, error } = await client
      .from("Cohorts")
      .select()
      .eq("id", cohort.id)
      .single();

    expect(error).toBeNull();
    expect(persisted).toBeTruthy();
    expect(persisted!.term).toBe("Fall");
    expect(persisted!.year).toBe(TEST_YEAR);
    expect(persisted!.is_active).toBe(false);
  });

  it("returns 404 when cohort does not exist", async () => {
    const result = await updateCohort(999999999, { year: TEST_YEAR });

    expect(result.status).toBe(404);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/cohort not found/i);
  });

  it("returns 409 when update violates unique (term, year) constraint", async () => {
    const first = await seedCohort({ term: "Fall", year: TEST_YEAR });
    const second = await seedCohort({ term: "Spring", year: TEST_YEAR });
    expect(first.id).not.toBe(second.id);

    const result = await updateCohort(second.id, { term: first.term });

    expect(result.status).toBe(409);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toBe(
      "A cohort with this term and year already exists"
    );
  });

  it("updates only the provided field(s)", async () => {
    const cohort = await seedCohort({
      term: "Fall",
      year: TEST_YEAR,
      is_active: true,
    });

    const result = await updateCohort(cohort.id, { is_active: false });

    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body.cohort.id).toBe(cohort.id);
    expect(result.body.cohort.term).toBe("Fall");
    expect(result.body.cohort.year).toBe(TEST_YEAR);
    expect(result.body.cohort.is_active).toBe(false);
  });
});
