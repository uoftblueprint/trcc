import { describe, it, expect } from "vitest";

// Extract and test the canManageStaff logic directly
function canManageStaff(role: "admin" | "staff" | null): role is "admin" {
  return role === "admin";
}

describe("canManageStaff", () => {
  it("allows admin access", () => {
    expect(canManageStaff("admin")).toBe(true);
  });

  it("denies staff access", () => {
    expect(canManageStaff("staff")).toBe(false);
  });

  it("denies null role access", () => {
    expect(canManageStaff(null)).toBe(false);
  });
});
