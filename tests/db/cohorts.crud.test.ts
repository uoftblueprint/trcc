import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createServiceTestClient,
  deleteWhere,
  hasServiceRoleKey,
} from "./helpers";
import { makeTestCohortInsert } from "./factories";

// If the service role key isn't configured, we skip these integration tests.
// This makes `npm test` still useful for contributors who haven't set up local DB testing yet.
const describeDb = hasServiceRoleKey() ? describe : describe.skip;

describeDb("db: Cohorts CRUD (integration)", () => {
  const client = createServiceTestClient();

  // Keep tests isolated by cleaning up test rows each time, deleting any rows with a "TEST_" prefix
  beforeEach(async () => {
    await deleteWhere(client, "Cohorts", "term", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "Cohorts", "term", "TEST_%");
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

    // Confirm gone
    const { data: afterDelete, error: afterDeleteError } = await client
      .from("Cohorts")
      .select()
      .eq("id", id);

    expect(afterDeleteError).toBeNull();
    expect(afterDelete).toHaveLength(0);
  });
});
