// Tests the API function that fetches all roles from the Roles table

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import { makeTestRoleInsert } from "../support/factories";
import { getRoles } from "@/lib/api/getRoles";
import type { Database } from "@/lib/client/supabase/types";

type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];

describe("getRoles (integration)", () => {
  const client = createServiceTestClient();

  // Cleanup test data before and after each test
  beforeEach(async () => {
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  it("returns an array", async () => {
    const result = await getRoles();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns all inserted test roles", async () => {
    // Insert two test roles
    const role1 = makeTestRoleInsert({
      name: "TEST_Role_Alpha",
      type: "current",
    });
    const role2 = makeTestRoleInsert({ name: "TEST_Role_Beta", type: "prior" });

    const { error: err1 } = await client.from("Roles").insert(role1);
    expect(err1).toBeNull();

    const { error: err2 } = await client.from("Roles").insert(role2);
    expect(err2).toBeNull();

    const result = await getRoles();

    // The result should contain both test roles
    const names = result.map((r) => r.name);
    expect(names).toContain("TEST_Role_Alpha");
    expect(names).toContain("TEST_Role_Beta");
  });

  it("returns RoleRow objects with correct properties", async () => {
    // Insert a role with known values
    const roleInsert = makeTestRoleInsert({
      name: "TEST_Role_Props",
      type: "future_interest",
      is_active: false,
    });

    const { data: inserted, error } = await client
      .from("Roles")
      .insert(roleInsert)
      .select()
      .single();

    expect(error).toBeNull();
    expect(inserted).toBeTruthy();

    const result = await getRoles();
    const found = result.find((r) => r.id === inserted!.id);

    expect(found).toBeTruthy();
    const role = found as RoleRow;
    expect(role).toHaveProperty("id");
    expect(role).toHaveProperty("name", "TEST_Role_Props");
    expect(role).toHaveProperty("type", "future_interest");
    expect(role).toHaveProperty("is_active", false);
    expect(role).toHaveProperty("created_at");
    expect(typeof role.id).toBe("number");
    expect(typeof role.created_at).toBe("string");
  });

  it("includes roles of all valid types", async () => {
    const rolePrior = makeTestRoleInsert({
      name: "TEST_Role_Prior",
      type: "prior",
    });
    const roleCurrent = makeTestRoleInsert({
      name: "TEST_Role_Current",
      type: "current",
    });
    const roleFuture = makeTestRoleInsert({
      name: "TEST_Role_Future",
      type: "future_interest",
    });

    await client.from("Roles").insert(rolePrior);
    await client.from("Roles").insert(roleCurrent);
    await client.from("Roles").insert(roleFuture);

    const result = await getRoles();
    const names = result.map((r) => r.name);

    expect(names).toContain("TEST_Role_Prior");
    expect(names).toContain("TEST_Role_Current");
    expect(names).toContain("TEST_Role_Future");
  });

  it("includes both active and inactive roles", async () => {
    const activeRole = makeTestRoleInsert({
      name: "TEST_Role_Active",
      type: "current",
      is_active: true,
    });
    const inactiveRole = makeTestRoleInsert({
      name: "TEST_Role_Inactive",
      type: "current",
      is_active: false,
    });

    await client.from("Roles").insert(activeRole);
    await client.from("Roles").insert(inactiveRole);

    const result = await getRoles();
    const names = result.map((r) => r.name);

    expect(names).toContain("TEST_Role_Active");
    expect(names).toContain("TEST_Role_Inactive");
  });

  it("reflects a newly inserted role", async () => {
    // Get initial count
    const before = await getRoles();
    const countBefore = before.length;

    // Insert a new role
    const newRole = makeTestRoleInsert({
      name: "TEST_Role_New",
      type: "current",
    });
    const { error } = await client.from("Roles").insert(newRole);
    expect(error).toBeNull();

    // Fetch again and verify count increased
    const after = await getRoles();
    expect(after.length).toBe(countBefore + 1);
    expect(after.map((r) => r.name)).toContain("TEST_Role_New");
  });

  it("does not include a deleted role", async () => {
    // Insert then delete a role
    const roleInsert = makeTestRoleInsert({
      name: "TEST_Role_Deleted",
      type: "current",
    });
    const { data: inserted, error: insertErr } = await client
      .from("Roles")
      .insert(roleInsert)
      .select()
      .single();

    expect(insertErr).toBeNull();
    expect(inserted).toBeTruthy();

    // Delete the role
    const { error: deleteErr } = await client
      .from("Roles")
      .delete()
      .eq("id", inserted!.id);
    expect(deleteErr).toBeNull();

    // Verify it's not returned by getRoles
    const result = await getRoles();
    const found = result.find((r) => r.id === inserted!.id);
    expect(found).toBeUndefined();
  });
});
