import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createRole } from "@/lib/api/createRole";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import { makeTestRoleInsert } from "../support/factories";

describe("createRole", () => {
  // Test validation - missing name
  it("should fail when name is missing", async () => {
    const result = await createRole({ type: "current" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(result.validationErrors).toBeDefined();
      expect(
        result.validationErrors!.some((e) => e.field === "role.name")
      ).toBe(true);
    }
  });

  // Test validation - missing type
  it("should fail when type is missing", async () => {
    const result = await createRole({ name: "TEST_Name" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(
        result.validationErrors!.some((e) => e.field === "role.type")
      ).toBe(true);
    }
  });

  // Test validation - invalid role type
  it("should fail when role type is invalid", async () => {
    const result = await createRole({
      name: "TEST_Name",
      type: "invalid_type",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(
        result.validationErrors!.some(
          (e) => e.field === "role.type" && e.message.includes("prior, current")
        )
      ).toBe(true);
    }
  });

  // Test validation - empty name
  it("should fail when name is empty string", async () => {
    const result = await createRole({ name: "   ", type: "current" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.validationErrors!.some(
          (e) =>
            e.field === "role.name" && e.message.includes("cannot be empty")
        )
      ).toBe(true);
    }
  });

  // Test validation - invalid is_active type
  it("should fail when is_active is not a boolean", async () => {
    const result = await createRole({
      name: "TEST_Name",
      type: "current",
      is_active: "true",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.validationErrors!.some(
          (e) =>
            e.field === "role.is_active" &&
            e.message.includes("must be a boolean")
        )
      ).toBe(true);
    }
  });

  // Test validation - empty input
  it("should fail when input is empty array", async () => {
    const result = await createRole([]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(
        result.validationErrors!.some((e) =>
          e.message.includes("cannot be empty")
        )
      ).toBe(true);
    }
  });

  // Test validation - null input
  it("should handle null input gracefully", async () => {
    const result = await createRole(null);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
    }
  });

  // Test validation - array with invalid item
  it("should fail when array contains invalid role", async () => {
    const result = await createRole([
      { name: "TEST_Valid", type: "current" },
      { name: "TEST_Invalid", type: "bad_type" },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.validationErrors!.some((e) => e.field.includes("[1]"))
      ).toBe(true);
    }
  });

  describe("integration (requires DB)", () => {
    const client = createServiceTestClient();

    beforeEach(async () => {
      await deleteWhere(client, "Roles", "name", "TEST_%");
    });

    afterEach(async () => {
      await deleteWhere(client, "Roles", "name", "TEST_%");
    });

    it("creates a role with default is_active=true", async () => {
      const roleInput = makeTestRoleInsert({ type: "current" });
      const result = await createRole({
        name: roleInput.name,
        type: "current",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const created = result.data[0];
      expect(result.data).toHaveLength(1);
      expect(created).toBeTruthy();
      expect(created!.name).toBe(roleInput.name);
      expect(created!.type).toBe("current");
      expect(created!.is_active).toBe(true);
      expect(created!.id).toBeTypeOf("number");
      expect(created!.created_at).toBeTruthy();

      // Verify persisted in database
      const { data: persisted, error } = await client
        .from("Roles")
        .select()
        .eq("id", created!.id)
        .single();

      expect(error).toBeNull();
      expect(persisted).toBeTruthy();
      expect(persisted!.name).toBe(roleInput.name);
      expect(persisted!.type).toBe("current");
      expect(persisted!.is_active).toBe(true);
    });

    it("creates a role with explicit is_active=false", async () => {
      const roleInput = makeTestRoleInsert({ type: "prior", is_active: false });
      const result = await createRole({
        name: roleInput.name,
        type: "prior",
        is_active: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const created = result.data[0];
      expect(result.data).toHaveLength(1);
      expect(created).toBeTruthy();
      expect(created!.name).toBe(roleInput.name);
      expect(created!.type).toBe("prior");
      expect(created!.is_active).toBe(false);
    });

    it("creates roles for all valid role types", async () => {
      const priorInput = makeTestRoleInsert({ type: "prior" });
      const currentInput = makeTestRoleInsert({ type: "current" });
      const futureInput = makeTestRoleInsert({ type: "future_interest" });

      const priorResult = await createRole({
        name: priorInput.name,
        type: "prior",
      });
      const currentResult = await createRole({
        name: currentInput.name,
        type: "current",
      });
      const futureResult = await createRole({
        name: futureInput.name,
        type: "future_interest",
      });

      expect(priorResult.success).toBe(true);
      expect(currentResult.success).toBe(true);
      expect(futureResult.success).toBe(true);

      if (
        priorResult.success &&
        currentResult.success &&
        futureResult.success
      ) {
        expect(priorResult.data[0]!.type).toBe("prior");
        expect(currentResult.data[0]!.type).toBe("current");
        expect(futureResult.data[0]!.type).toBe("future_interest");
      }
    });

    it("creates multiple roles when passed an array payload", async () => {
      const roleOne = makeTestRoleInsert({ type: "current" });
      const roleTwo = makeTestRoleInsert({ type: "prior" });

      const result = await createRole([
        { name: roleOne.name, type: roleOne.type },
        { name: roleTwo.name, type: roleTwo.type, is_active: false },
      ]);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(2);
      expect(result.data.map((r) => r.name)).toEqual(
        expect.arrayContaining([roleOne.name, roleTwo.name])
      );
    });

    it("enforces unique constraint on role name", async () => {
      const duplicate = makeTestRoleInsert({ type: "current" });
      const firstResult = await createRole({
        name: duplicate.name,
        type: "current",
      });

      expect(firstResult.success).toBe(true);

      const secondResult = await createRole({
        name: duplicate.name,
        type: "current",
      });

      expect(secondResult.success).toBe(false);
      if (!secondResult.success) {
        expect(secondResult.error).toMatch(/already exists/i);
      }
    });

    it("successfully creates role with trimmed name and type", async () => {
      const result = await createRole({
        name: "  TEST_Trimmed_Role  ",
        type: "  current  ",
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data[0]!.name).toBe("TEST_Trimmed_Role");
      expect(result.data[0]!.type).toBe("current");
    });

    it("creates role and returns complete row data", async () => {
      const roleInput = makeTestRoleInsert({ type: "future_interest" });
      const result = await createRole({
        name: roleInput.name,
        type: "future_interest",
        is_active: false,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;

      const role = result.data[0]!;
      expect(role).toHaveProperty("id");
      expect(role).toHaveProperty("name");
      expect(role).toHaveProperty("type");
      expect(role).toHaveProperty("is_active");
      expect(role).toHaveProperty("created_at");
      expect(typeof role.id).toBe("number");
      expect(typeof role.name).toBe("string");
      expect(typeof role.created_at).toBe("string");
    });
  });
});
