import { describe, it, expect } from "vitest";
import { createRole } from "@/lib/api/";
import type { Database } from "@/lib/client/supabase/types";
import { afterEach } from "node:test";
import { createClient } from "@/lib/client/supabase/server";

// type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];

afterEach(async () => {
  // Clean up created roles after each test to maintain test isolation
  const client = await createClient();
  const { error } = await client
    .from("Roles")
    .delete()
    .neq("name", "Administrator"); // Keep Administrator role if it exists

  if (error) {
    console.error("Error cleaning up roles after test:", error);
  }
});

describe("createRole: valid input cases.", () => {
  // Test creating role with default is_active
  it("Should create role with default is_active.", async () => {
    const result = await createRole("Crisis Line Counsellor", "current");

    expect(result).toBeDefined();
    expect(result.is_active).toBe(true);
  });

  // Check if createRole creates a role with all fields
  it("Should return a role with all fields.", async () => {
    const result = await createRole("F2F", "current");

    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("created_at");
    expect(result.name).toBe("F2F");
    expect(result.type).toBe("current");
    expect(result.is_active).toBe(true);
  });

  // Test multiple role types
  it("Should create roles with different types.", async () => {
    const priorRole = await createRole("Front Desk", "prior");
    const currentRole = await createRole("Front Desk", "current");
    const futureInterestRole = await createRole(
      "Front Desk",
      "future_interest"
    );

    // Prior role
    expect(priorRole.type).toBe("prior");
    expect(priorRole.name).toBe("Front Desk");

    // Current role
    expect(currentRole.type).toBe("current");
    expect(currentRole.name).toBe("Front Desk");

    // Future interest role
    expect(futureInterestRole.type).toBe("future_interest");
    expect(futureInterestRole.name).toBe("Front Desk");

    // Check that each role has a unique id
    const ids = new Set([priorRole.id, currentRole.id, futureInterestRole.id]);
    expect(ids.size).toBe(3);
  });
});

describe("createRole: invalid input cases.", () => {
    // Test missing name
    it("Should throw error when name is missing.", async () => {
      await expect(createRole("", "current")).rejects.toThrow(
        "Name and type are required to create a role."
      );
    });
  
    // Test missing type
    it("Should throw error when type is missing.", async () => {
      await expect(createRole("Some Role", "" as any)).rejects.toThrow(
        "Name and type are required to create a role."
      );
    });
});