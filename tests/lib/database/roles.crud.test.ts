import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import { makeTestRoleInsert } from "../support/factories";

describe("db: Roles CRUD (integration)", () => {
  const client = createServiceTestClient();

  beforeEach(async () => {
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  it("creates, reads, updates, and deletes a Role row", async () => {
    // CREATE
    const insert = makeTestRoleInsert();
    const { data: created, error: createError } = await client
      .from("Roles")
      .insert(insert)
      .select()
      .single();

    expect(createError).toBeNull();
    expect(created).toBeTruthy();
    expect(created!.name).toBe(insert.name);
    expect(created!.type).toBe(insert.type);

    const id = created!.id;

    // READ
    const { data: fetched, error: readError } = await client
      .from("Roles")
      .select()
      .eq("id", id)
      .single();

    expect(readError).toBeNull();
    expect(fetched!.id).toBe(id);
    expect(fetched!.name).toBe(insert.name);

    // UPDATE
    const { data: updated, error: updateError } = await client
      .from("Roles")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updated!.id).toBe(id);
    expect(updated!.is_active).toBe(false);

    // DELETE
    const { error: deleteError } = await client
      .from("Roles")
      .delete()
      .eq("id", id);
    expect(deleteError).toBeNull();

    const { data: afterDelete, error: afterDeleteError } = await client
      .from("Roles")
      .select()
      .eq("id", id);

    expect(afterDeleteError).toBeNull();
    expect(afterDelete).toHaveLength(0);
  });

  it("can query roles by type", async () => {
    const currentRole = makeTestRoleInsert({ type: "current" });
    const priorRole = makeTestRoleInsert({ type: "prior" });

    await client.from("Roles").insert([currentRole, priorRole]);

    const { data: currentRoles, error } = await client
      .from("Roles")
      .select()
      .eq("type", "current")
      .like("name", "TEST_%");

    expect(error).toBeNull();
    expect(currentRoles!.length).toBeGreaterThanOrEqual(1);
    expect(currentRoles!.every((r) => r.type === "current")).toBe(true);
  });

  it("can filter active vs inactive roles", async () => {
    const activeRole = makeTestRoleInsert({ is_active: true });
    const inactiveRole = makeTestRoleInsert({ is_active: false });

    await client.from("Roles").insert([activeRole, inactiveRole]);

    const { data: active, error } = await client
      .from("Roles")
      .select()
      .eq("is_active", true)
      .like("name", "TEST_%");

    expect(error).toBeNull();
    expect(active!.every((r) => r.is_active === true)).toBe(true);
  });
});
