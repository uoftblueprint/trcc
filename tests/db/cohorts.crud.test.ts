import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceTestClient, deleteWhereGte } from "../helpers";
import { makeTestCohortInsert, TEST_YEAR } from "../factories";

describe("db: Cohorts CRUD (integration)", () => {
  const client = createServiceTestClient();

  // Keep tests isolated by cleaning up test cohorts by year (>= 2099)
  beforeEach(async () => {
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  it("creates, reads, updates, and deletes a Cohort row", async () => {
    // CREATE
    const insert = makeTestCohortInsert();
    const { data: created, error: createError } = await client
      .from("Cohorts")
      .insert(insert)
      .select()
      .single();

    expect(createError).toBeNull();
    expect(created).toBeTruthy();
    expect(created!.term).toBe(insert.term);
    expect(created!.year).toBe(insert.year);

    const id = created!.id;
    // READ
    const { data: fetched, error: readError } = await client
      .from("Cohorts")
      .select()
      .eq("id", id)
      .single();

    expect(readError).toBeNull();
    expect(fetched!.id).toBe(id);
    expect(fetched!.term).toBe(insert.term);

    // UPDATE
    const { data: updated, error: updateError } = await client
      .from("Cohorts")
      .update({ is_active: true })
      .eq("id", id)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updated!.id).toBe(id);
    expect(updated!.is_active).toBe(true);

    // DELETE
    const { error: deleteError } = await client
      .from("Cohorts")
      .delete()
      .eq("id", id);
    expect(deleteError).toBeNull();

    const { data: afterDelete, error: afterDeleteError } = await client
      .from("Cohorts")
      .select()
      .eq("id", id);

    expect(afterDeleteError).toBeNull();
    expect(afterDelete).toHaveLength(0);
  });
});
