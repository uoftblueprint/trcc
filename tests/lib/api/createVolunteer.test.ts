// Tests for createVolunteer API function

import { describe, it, expect } from "vitest";
import { createVolunteer } from "@/lib/api/createVolunteer";
import type { CreateVolunteerInput } from "@/lib/api/createVolunteer";

describe("createVolunteer", () => {
  // Test validation - missing volunteer data
  it("should fail when volunteer data is missing", async () => {
    const input = {
      role: { name: "Test Role", type: "current" },
      cohort: { year: 2024, term: "fall" },
    } as CreateVolunteerInput;

    const result = await createVolunteer(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(result.validationErrors).toBeDefined();
      expect(
        result.validationErrors!.some((e) => e.field === "volunteer")
      ).toBe(true);
    }
  });

  // Test validation - missing name_org
  it("should fail when name_org is missing", async () => {
    const input: CreateVolunteerInput = {
      volunteer: {
        email: "test@example.com",
      } as CreateVolunteerInput["volunteer"],
      role: { name: "Test Role", type: "current" },
      cohort: { year: 2024, term: "fall" },
    };

    const result = await createVolunteer(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(
        result.validationErrors!.some((e) => e.field === "volunteer.name_org")
      ).toBe(true);
    }
  });

  // Test validation - empty name_org
  it("should fail when name_org is empty", async () => {
    const input: CreateVolunteerInput = {
      volunteer: { name_org: "   " },
      role: { name: "Test Role", type: "current" },
      cohort: { year: 2024, term: "fall" },
    };

    const result = await createVolunteer(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.validationErrors!.some(
          (e) =>
            e.field === "volunteer.name_org" &&
            e.message.includes("cannot be empty")
        )
      ).toBe(true);
    }
  });

  // Test validation - invalid email
  it("should fail when email is invalid", async () => {
    const input: CreateVolunteerInput = {
      volunteer: { name_org: "Test Volunteer", email: "not-an-email" },
      role: { name: "Test Role", type: "current" },
      cohort: { year: 2024, term: "fall" },
    };

    const result = await createVolunteer(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.validationErrors!.some((e) => e.field === "volunteer.email")
      ).toBe(true);
    }
  });

  // Test validation - missing role
  it("should fail when role is missing", async () => {
    const input = {
      volunteer: { name_org: "Test Volunteer" },
      cohort: { year: 2024, term: "fall" },
    } as CreateVolunteerInput;

    const result = await createVolunteer(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.validationErrors!.some((e) => e.field === "role")).toBe(
        true
      );
    }
  });

  // Test validation - invalid role type
  it("should fail when role type is invalid", async () => {
    const input = {
      volunteer: { name_org: "Test Volunteer" },
      role: { name: "Test Role", type: "invalid_type" },
      cohort: { year: 2024, term: "fall" },
    } as unknown as CreateVolunteerInput;

    const result = await createVolunteer(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.validationErrors!.some((e) => e.field === "role.type")
      ).toBe(true);
    }
  });

  // Test validation - missing cohort
  it("should fail when cohort is missing", async () => {
    const input = {
      volunteer: { name_org: "Test Volunteer" },
      role: { name: "Test Role", type: "current" },
    } as CreateVolunteerInput;

    const result = await createVolunteer(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.validationErrors!.some((e) => e.field === "cohort")).toBe(
        true
      );
    }
  });

  // Test validation - invalid cohort term
  it("should fail when cohort term is invalid", async () => {
    const input = {
      volunteer: { name_org: "Test Volunteer" },
      role: { name: "Test Role", type: "current" },
      cohort: { year: 2024, term: "autumn" },
    } as unknown as CreateVolunteerInput;

    const result = await createVolunteer(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.validationErrors!.some((e) => e.field === "cohort.term")
      ).toBe(true);
    }
  });

  // Test validation - cohort year must be integer
  it("should fail when cohort year is not an integer", async () => {
    const input: CreateVolunteerInput = {
      volunteer: { name_org: "Test Volunteer" },
      role: { name: "Test Role", type: "current" },
      cohort: { year: 2024.5, term: "fall" },
    };

    const result = await createVolunteer(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.validationErrors!.some(
          (e) => e.field === "cohort.year" && e.message.includes("integer")
        )
      ).toBe(true);
    }
  });

  // Test edge case - null input
  it("should handle null input gracefully", async () => {
    const result = await createVolunteer(
      null as unknown as CreateVolunteerInput
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
    }
  });

  // Test edge case - empty object
  it("should handle empty object input gracefully", async () => {
    const result = await createVolunteer({} as CreateVolunteerInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(result.validationErrors).toBeDefined();
    }
  });
});
