// Tests for createVolunteer API function

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createVolunteer } from "@/lib/api/createVolunteer";
import type { CreateVolunteerInput } from "@/lib/api/createVolunteer";
import {
  createServiceTestClient,
  deleteWhere,
  deleteWhereGte,
} from "../support/helpers";
import {
  makeTestRoleInsert,
  makeTestCohortInsert,
  TEST_YEAR,
} from "../support/factories";

describe("createVolunteer", () => {
  // Test validation - missing volunteer data
  it("should fail when volunteer data is missing", async () => {
    const input = {
      role: { name: "Test Role", type: "current" },
      cohort: { year: 2024, term: "Fall" },
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
      cohort: { year: 2024, term: "Fall" },
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
      cohort: { year: 2024, term: "Fall" },
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

  // Test validation - missing role
  it("should fail when role is missing", async () => {
    const input = {
      volunteer: { name_org: "Test Volunteer" },
      cohort: { year: 2024, term: "Fall" },
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
      cohort: { year: 2024, term: "Fall" },
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
      cohort: { year: 2024.5, term: "Fall" },
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

  describe("integration (requires DB)", () => {
    const client = createServiceTestClient();

    beforeEach(async () => {
      await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
      await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
      await deleteWhere(client, "Roles", "name", "TEST_%");
    });

    afterEach(async () => {
      await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
      await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
      await deleteWhere(client, "Roles", "name", "TEST_%");
    });

    it("creates volunteer with role and cohort when valid", async () => {
      const roleInsert = makeTestRoleInsert({ name: "TEST_Integration_Role" });
      const cohortInsert = makeTestCohortInsert({
        term: "Fall",
        year: TEST_YEAR,
      });

      const { data: role, error: roleError } = await client
        .from("Roles")
        .insert(roleInsert)
        .select("id, name, type")
        .single();

      expect(roleError).toBeNull();
      expect(role).toBeTruthy();

      const { data: cohort, error: cohortError } = await client
        .from("Cohorts")
        .insert(cohortInsert)
        .select("id, year, term")
        .single();

      expect(cohortError).toBeNull();
      expect(cohort).toBeTruthy();

      const input: CreateVolunteerInput = {
        volunteer: {
          name_org: "TEST_Integration_Volunteer",
          email: "integration@example.com",
        },
        role: { name: role!.name, type: role!.type as "current" },
        cohort: { year: cohort!.year, term: cohort!.term as "Fall" },
      };

      const result = await createVolunteer(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("id");
        expect(typeof result.data.id).toBe("number");
      }
    });

    it("creates role when it does not exist", async () => {
      const input: CreateVolunteerInput = {
        volunteer: {
          name_org: "TEST_Integration_Volunteer",
          email: "integration@example.com",
        },
        role: { name: "TEST_AutoCreated_Role", type: "current" },
        cohort: { year: TEST_YEAR, term: "Fall" },
      };

      const result = await createVolunteer(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.id).toBe("number");
      }
      const { data: role } = await client
        .from("Roles")
        .select("id")
        .eq("name", "TEST_AutoCreated_Role")
        .single();
      expect(role).toBeTruthy();
    });

    it("creates cohort when it does not exist", async () => {
      // Use a year within smallint range and distinct from TEST_YEAR (2099)
      const nonexistentYear = 2098;
      const input: CreateVolunteerInput = {
        volunteer: {
          name_org: "TEST_Integration_Volunteer",
          email: "integration@example.com",
        },
        role: { name: "TEST_Integration_Role", type: "current" },
        cohort: { year: nonexistentYear, term: "Fall" },
      };

      const result = await createVolunteer(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.id).toBe("number");
      }
      const { data: cohort } = await client
        .from("Cohorts")
        .select("id")
        .eq("year", nonexistentYear)
        .eq("term", "Fall")
        .single();
      expect(cohort).toBeTruthy();
    });

    it("successfully creates a volunteer with just name_org", async () => {
      const input: CreateVolunteerInput = {
        volunteer: { name_org: "TEST_Integration_Volunteer" },
        role: { name: "TEST_Integration_Role", type: "current" },
        cohort: { year: TEST_YEAR, term: "Fall" },
      };

      const result = await createVolunteer(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("id");
        expect(typeof result.data.id).toBe("number");
      }
    });

    describe("RPC: junction tables and get-or-create", () => {
      it("creates VolunteerRoles and VolunteerCohorts rows linking volunteer to role and cohort", async () => {
        const input: CreateVolunteerInput = {
          volunteer: {
            name_org: "TEST_RPC_Junction_Volunteer",
            email: "rpc-junction@example.com",
          },
          role: { name: "TEST_RPC_Junction_Role", type: "prior" },
          cohort: { year: TEST_YEAR, term: "Spring" },
        };

        const result = await createVolunteer(input);
        expect(result.success).toBe(true);
        if (!result.success) return;

        const volunteerId = result.data.id;

        const { data: volunteerRole, error: vrError } = await client
          .from("VolunteerRoles")
          .select("volunteer_id, role_id")
          .eq("volunteer_id", volunteerId)
          .single();

        expect(vrError).toBeNull();
        expect(volunteerRole).toBeTruthy();
        expect(volunteerRole!.volunteer_id).toBe(volunteerId);
        expect(typeof volunteerRole!.role_id).toBe("number");

        const { data: volunteerCohort, error: vcError } = await client
          .from("VolunteerCohorts")
          .select("volunteer_id, cohort_id")
          .eq("volunteer_id", volunteerId)
          .single();

        expect(vcError).toBeNull();
        expect(volunteerCohort).toBeTruthy();
        expect(volunteerCohort!.volunteer_id).toBe(volunteerId);
        expect(typeof volunteerCohort!.cohort_id).toBe("number");
      });

      it("reuses existing role when creating second volunteer with same role name", async () => {
        const roleName = "TEST_RPC_Shared_Role";
        const input1: CreateVolunteerInput = {
          volunteer: {
            name_org: "TEST_RPC_Volunteer_One",
            email: "one@example.com",
          },
          role: { name: roleName, type: "current" },
          cohort: { year: TEST_YEAR, term: "Summer" },
        };
        const result1 = await createVolunteer(input1);
        expect(result1.success).toBe(true);
        if (!result1.success) return;

        const input2: CreateVolunteerInput = {
          volunteer: {
            name_org: "TEST_RPC_Volunteer_Two",
            email: "two@example.com",
          },
          role: { name: roleName, type: "current" },
          cohort: { year: TEST_YEAR, term: "Summer" },
        };
        const result2 = await createVolunteer(input2);
        expect(result2.success).toBe(true);
        if (!result2.success) return;

        const { data: roles } = await client
          .from("Roles")
          .select("id")
          .eq("name", roleName);
        expect(roles).toHaveLength(1);
        const roleId = roles?.[0]?.id;
        expect(roleId).toBeDefined();

        const { data: vrRows } = await client
          .from("VolunteerRoles")
          .select("volunteer_id, role_id")
          .eq("role_id", roleId!);
        expect(vrRows).toHaveLength(2);
        expect(vrRows!.map((r) => r.volunteer_id).sort()).toEqual(
          [result1.data.id, result2.data.id].sort()
        );
      });

      it("reuses existing cohort when creating second volunteer with same year and term", async () => {
        const cohortYear = 2097;
        const cohortTerm = "Winter";
        const input1: CreateVolunteerInput = {
          volunteer: {
            name_org: "TEST_RPC_Cohort_Vol_One",
            email: "cohort1@example.com",
          },
          role: { name: "TEST_RPC_Cohort_Role", type: "future_interest" },
          cohort: { year: cohortYear, term: cohortTerm },
        };
        const result1 = await createVolunteer(input1);
        expect(result1.success).toBe(true);
        if (!result1.success) return;

        const input2: CreateVolunteerInput = {
          volunteer: {
            name_org: "TEST_RPC_Cohort_Vol_Two",
            email: "cohort2@example.com",
          },
          role: { name: "TEST_RPC_Cohort_Role", type: "future_interest" },
          cohort: { year: cohortYear, term: cohortTerm },
        };
        const result2 = await createVolunteer(input2);
        expect(result2.success).toBe(true);
        if (!result2.success) return;

        const { data: cohorts } = await client
          .from("Cohorts")
          .select("id")
          .eq("year", cohortYear)
          .eq("term", cohortTerm);
        expect(cohorts?.length).toBeGreaterThanOrEqual(1);
        const cohortId = cohorts?.[0]?.id;
        expect(cohortId).toBeDefined();

        const { data: vcRows } = await client
          .from("VolunteerCohorts")
          .select("volunteer_id, cohort_id")
          .eq("cohort_id", cohortId!);
        expect(vcRows!.length).toBeGreaterThanOrEqual(2);
        const volunteerIds = vcRows!.map((r) => r.volunteer_id);
        expect(volunteerIds).toContain(result1.data.id);
        expect(volunteerIds).toContain(result2.data.id);
      });

      it("stores all volunteer optional fields via RPC", async () => {
        const input: CreateVolunteerInput = {
          volunteer: {
            name_org: "TEST_RPC_Full_Volunteer",
            pseudonym: "TestPseudonym",
            pronouns: "they/them",
            email: "full@example.com",
            phone: "555-1234",
            position: "volunteer",
            opt_in_communication: false,
            notes: "Test notes for RPC",
          },
          role: { name: "TEST_RPC_Full_Role", type: "current" },
          cohort: { year: TEST_YEAR, term: "Fall" },
        };

        const result = await createVolunteer(input);
        expect(result.success).toBe(true);
        if (!result.success) return;

        const { data: volunteer, error } = await client
          .from("Volunteers")
          .select(
            "name_org, pseudonym, pronouns, email, phone, position, opt_in_communication, notes"
          )
          .eq("id", result.data.id)
          .single();

        expect(error).toBeNull();
        expect(volunteer).toBeTruthy();
        expect(volunteer!.name_org).toBe("TEST_RPC_Full_Volunteer");
        expect(volunteer!.pseudonym).toBe("TestPseudonym");
        expect(volunteer!.pronouns).toBe("they/them");
        expect(volunteer!.email).toBe("full@example.com");
        expect(volunteer!.phone).toBe("555-1234");
        expect(volunteer!.position).toBe("volunteer");
        expect(volunteer!.opt_in_communication).toBe(false);
        expect(volunteer!.notes).toBe("Test notes for RPC");
      });

      it("creates volunteer with each valid cohort term (Fall, Spring, Summer, Winter)", async () => {
        const terms = ["Fall", "Spring", "Summer", "Winter"] as const;
        for (const term of terms) {
          const input: CreateVolunteerInput = {
            volunteer: {
              name_org: `TEST_RPC_Term_${term}`,
              email: `term-${term.toLowerCase()}@example.com`,
            },
            role: { name: "TEST_RPC_Term_Role", type: "current" },
            cohort: { year: TEST_YEAR, term },
          };
          const result = await createVolunteer(input);
          expect(result.success).toBe(true);
          if (!result.success) return;

          const { data: vc } = await client
            .from("VolunteerCohorts")
            .select("cohort_id")
            .eq("volunteer_id", result.data.id)
            .single();

          expect(vc).toBeTruthy();
          const { data: cohort } = await client
            .from("Cohorts")
            .select("term")
            .eq("id", vc!.cohort_id)
            .single();
          expect(cohort!.term).toBe(term);
        }
      });

      it("creates volunteer with each valid role type (prior, current, future_interest)", async () => {
        const types = ["prior", "current", "future_interest"] as const;
        for (const type of types) {
          const input: CreateVolunteerInput = {
            volunteer: {
              name_org: `TEST_RPC_Type_${type}`,
              email: `type-${type}@example.com`,
            },
            role: { name: `TEST_RPC_Type_Role_${type}`, type },
            cohort: { year: TEST_YEAR, term: "Fall" },
          };
          const result = await createVolunteer(input);
          expect(result.success).toBe(true);
          if (!result.success) return;

          const { data: vr } = await client
            .from("VolunteerRoles")
            .select("role_id")
            .eq("volunteer_id", result.data.id)
            .single();

          expect(vr).toBeTruthy();
          const { data: role } = await client
            .from("Roles")
            .select("type")
            .eq("id", vr!.role_id)
            .single();
          expect(role!.type).toBe(type);
        }
      });
    });
  });
});
