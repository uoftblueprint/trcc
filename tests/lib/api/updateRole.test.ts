import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateRole } from "@/lib/api/updateRole";
import * as supabaseClient from "@/lib/client/supabase";
import type { Tables } from "@/lib/client/supabase/types";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import { makeTestRoleInsert } from "../support/factories";

const client = createServiceTestClient();

async function seedRole(
  overrides: Partial<Tables<"Roles">> = {}
): Promise<Tables<"Roles">> {
  const insert = makeTestRoleInsert(overrides);
  const { data, error } = await client
    .from("Roles")
    .insert(insert)
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to seed role");
  }

  return data;
}

describe("updateRole (unit)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid role id", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateRole("bad-id", { name: "TEST_Name" });

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/invalid role id/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for non-object body", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateRole(1, null);

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/json object/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown field", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateRole(1, { unknown: "value" });

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/unknown field/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for empty patch object", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateRole(1, {});

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/at least one updatable field/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid role type", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateRole(1, { type: "invalid_type" });

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/must be one of/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid is_active type", async () => {
    const createClientSpy = vi.spyOn(supabaseClient, "createClient");
    const result = await updateRole(1, { is_active: "true" });

    expect(result.status).toBe(400);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/must be a boolean/i);
    expect(createClientSpy).not.toHaveBeenCalled();
  });
});

describe("updateRole (integration)", () => {
  beforeEach(async () => {
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  it("updates a role and returns the updated object", async () => {
    const role = await seedRole({ type: "prior", is_active: true });

    const result = await updateRole(role.id, {
      name: "TEST_Updated_Role",
      type: "current",
      is_active: false,
    });

    expect(result.status).toBe(200);
    if (result.status !== 200) return;

    expect(result.body.role.id).toBe(role.id);
    expect(result.body.role.name).toBe("TEST_Updated_Role");
    expect(result.body.role.type).toBe("current");
    expect(result.body.role.is_active).toBe(false);

    const { data: persisted, error } = await client
      .from("Roles")
      .select()
      .eq("id", role.id)
      .single();

    expect(error).toBeNull();
    expect(persisted).toBeTruthy();
    expect(persisted!.name).toBe("TEST_Updated_Role");
    expect(persisted!.type).toBe("current");
    expect(persisted!.is_active).toBe(false);
  });

  it("returns 404 when role does not exist", async () => {
    const result = await updateRole(999999999, { name: "TEST_Missing_Role" });

    expect(result.status).toBe(404);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/role not found/i);
  });

  it("returns 409 when update violates unique name constraint", async () => {
    const first = await seedRole({ name: "TEST_Unique_Role_One" });
    const second = await seedRole({ name: "TEST_Unique_Role_Two" });
    expect(first.id).not.toBe(second.id);

    const result = await updateRole(second.id, { name: first.name });

    expect(result.status).toBe(409);
    if (result.status === 200) throw new Error("Expected error response");
    expect(result.body.error).toMatch(/duplicate|unique/i);
  });

  it("updates only the provided field(s)", async () => {
    const role = await seedRole({
      name: "TEST_Original_Role",
      type: "future_interest",
      is_active: true,
    });

    const result = await updateRole(role.id, { is_active: false });

    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body.role.name).toBe("TEST_Original_Role");
    expect(result.body.role.type).toBe("future_interest");
    expect(result.body.role.is_active).toBe(false);
  });
});
