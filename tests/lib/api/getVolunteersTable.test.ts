// Tests the API function that fetches all volunteers with their cohorts and roles

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createServiceTestClient,
  deleteWhere,
  deleteWhereGte,
} from "../support/helpers";
import {
  makeTestVolunteerInsert,
  makeTestCohortInsert,
  makeTestRoleInsert,
  makeTestVolunteerCohortInsert,
  makeTestVolunteerRoleInsert,
  TEST_YEAR,
} from "../support/factories";
import {
  getVolunteersTable,
  type VolunteerTableEntry,
} from "@/lib/api/getVolunteersTable";

describe("getVolunteersTable (integration)", () => {
  const client = createServiceTestClient();

  // Cleanup before and after each test
  beforeEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  describe("empty results", () => {
    it("returns empty array when no volunteers exist", async () => {
      const result = await getVolunteersTable();
      // Filter to only TEST_ volunteers to avoid existing data interference
      const testResults = result.filter((entry) =>
        entry.volunteer.name_org.startsWith("TEST_")
      );
      expect(testResults).toEqual([]);
    });
  });

  describe("volunteer without relations", () => {
    it("returns volunteer with empty cohorts and roles arrays", async () => {
      // Create a volunteer without any cohort or role associations
      await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_NoRelations" }));

      const result = await getVolunteersTable();
      const testVolunteer = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_NoRelations"
      );

      expect(testVolunteer).toBeDefined();
      expect(testVolunteer!.volunteer.name_org).toBe("TEST_Vol_NoRelations");
      expect(testVolunteer!.cohorts).toEqual([]);
      expect(testVolunteer!.roles).toEqual([]);
    });
  });

  describe("volunteer with cohorts only", () => {
    it("returns volunteer with their associated cohorts", async () => {
      // Create cohorts
      const { data: cohort1 } = await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }))
        .select()
        .single();

      const { data: cohort2 } = await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Spring", year: TEST_YEAR }))
        .select()
        .single();

      // Create volunteer
      const { data: vol } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_WithCohorts" }))
        .select()
        .single();

      // Link volunteer to cohorts
      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol!.id, cohort1!.id));

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol!.id, cohort2!.id));

      const result = await getVolunteersTable();
      const testVolunteer = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_WithCohorts"
      );

      expect(testVolunteer).toBeDefined();
      expect(testVolunteer!.cohorts).toHaveLength(2);
      const cohortTerms = testVolunteer!.cohorts.map((c) => c.term);
      expect(cohortTerms).toContain("Fall");
      expect(cohortTerms).toContain("Spring");
      expect(testVolunteer!.roles).toEqual([]);
    });
  });

  describe("volunteer with roles only", () => {
    it("returns volunteer with their associated roles", async () => {
      // Create roles
      const { data: role1 } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({ name: "TEST_Role_Admin", type: "current" })
        )
        .select()
        .single();

      const { data: role2 } = await client
        .from("Roles")
        .insert(makeTestRoleInsert({ name: "TEST_Role_Member", type: "prior" }))
        .select()
        .single();

      // Create volunteer
      const { data: vol } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_WithRoles" }))
        .select()
        .single();

      // Link volunteer to roles
      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol!.id, role1!.id));

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol!.id, role2!.id));

      const result = await getVolunteersTable();
      const testVolunteer = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_WithRoles"
      );

      expect(testVolunteer).toBeDefined();
      expect(testVolunteer!.roles).toHaveLength(2);
      const roleNames = testVolunteer!.roles.map((r) => r.name);
      expect(roleNames).toContain("TEST_Role_Admin");
      expect(roleNames).toContain("TEST_Role_Member");
      expect(testVolunteer!.cohorts).toEqual([]);
    });
  });

  describe("volunteer with both cohorts and roles", () => {
    it("returns volunteer with all associated cohorts and roles", async () => {
      // Create cohorts
      const { data: cohort1 } = await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Fall", year: TEST_YEAR }))
        .select()
        .single();

      const { data: cohort2 } = await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Winter", year: TEST_YEAR }))
        .select()
        .single();

      // Create roles
      const { data: role1 } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({ name: "TEST_Role_Facilitator", type: "current" })
        )
        .select()
        .single();

      const { data: role2 } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({
            name: "TEST_Role_Support",
            type: "future_interest",
          })
        )
        .select()
        .single();

      // Create volunteer
      const { data: vol } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_FullRelations" }))
        .select()
        .single();

      // Link to cohorts
      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol!.id, cohort1!.id));

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol!.id, cohort2!.id));

      // Link to roles
      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol!.id, role1!.id));

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol!.id, role2!.id));

      const result = await getVolunteersTable();
      const testVolunteer = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_FullRelations"
      );

      expect(testVolunteer).toBeDefined();

      // Check cohorts
      expect(testVolunteer!.cohorts).toHaveLength(2);
      const cohortTerms = testVolunteer!.cohorts.map((c) => c.term);
      expect(cohortTerms).toContain("Fall");
      expect(cohortTerms).toContain("Winter");

      // Check roles
      expect(testVolunteer!.roles).toHaveLength(2);
      const roleNames = testVolunteer!.roles.map((r) => r.name);
      expect(roleNames).toContain("TEST_Role_Facilitator");
      expect(roleNames).toContain("TEST_Role_Support");
    });
  });

  describe("multiple volunteers", () => {
    it("returns all volunteers with their respective relations", async () => {
      // Create cohort and role
      const { data: cohort } = await client
        .from("Cohorts")
        .insert(makeTestCohortInsert({ term: "Summer", year: TEST_YEAR }))
        .select()
        .single();

      const { data: role } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({ name: "TEST_Role_Shared", type: "current" })
        )
        .select()
        .single();

      // Create multiple volunteers with different relation configurations
      const { data: vol1 } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_Multi_1" }))
        .select()
        .single();

      const { data: vol2 } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_Multi_2" }))
        .select()
        .single();

      const { data: vol3 } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_Multi_3" }))
        .select()
        .single();

      // vol1: cohort + role, vol2: cohort only, vol3: role only
      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol1!.id, cohort!.id));
      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol1!.id, role!.id));

      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol2!.id, cohort!.id));

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol3!.id, role!.id));

      const result = await getVolunteersTable();

      // Find test volunteers
      const testVol1 = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_Multi_1"
      );
      const testVol2 = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_Multi_2"
      );
      const testVol3 = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_Multi_3"
      );

      // Verify vol1 has both cohort and role
      expect(testVol1).toBeDefined();
      expect(testVol1!.cohorts).toHaveLength(1);
      expect(testVol1!.roles).toHaveLength(1);

      // Verify vol2 has cohort only
      expect(testVol2).toBeDefined();
      expect(testVol2!.cohorts).toHaveLength(1);
      expect(testVol2!.roles).toEqual([]);

      // Verify vol3 has role only
      expect(testVol3).toBeDefined();
      expect(testVol3!.cohorts).toEqual([]);
      expect(testVol3!.roles).toHaveLength(1);
    });
  });

  describe("return value structure", () => {
    it("returns VolunteerTableEntry objects with correct properties", async () => {
      // Create cohort
      const { data: cohort } = await client
        .from("Cohorts")
        .insert(
          makeTestCohortInsert({
            term: "Fall",
            year: TEST_YEAR,
            is_active: true,
          })
        )
        .select()
        .single();

      // Create role
      const { data: role } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({
            name: "TEST_Role_Structure",
            type: "current",
            is_active: true,
          })
        )
        .select()
        .single();

      // Create volunteer with specific data
      const { data: vol } = await client
        .from("Volunteers")
        .insert(
          makeTestVolunteerInsert({
            name_org: "TEST_Vol_Structure",
            email: "test_structure@example.com",
            position: "staff",
            pseudonym: "TestPseudo",
            pronouns: "she/her",
            phone: "555-1234",
            opt_in_communication: true,
            notes: "Test structure notes",
          })
        )
        .select()
        .single();

      // Link volunteer to cohort and role
      await client
        .from("VolunteerCohorts")
        .insert(makeTestVolunteerCohortInsert(vol!.id, cohort!.id));

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol!.id, role!.id));

      const result = await getVolunteersTable();
      const testEntry = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_Structure"
      );

      expect(testEntry).toBeDefined();

      // Verify volunteer properties
      expect(testEntry!.volunteer).toHaveProperty("id");
      expect(testEntry!.volunteer).toHaveProperty(
        "name_org",
        "TEST_Vol_Structure"
      );
      expect(testEntry!.volunteer).toHaveProperty(
        "email",
        "test_structure@example.com"
      );
      expect(testEntry!.volunteer).toHaveProperty("position", "staff");
      expect(testEntry!.volunteer).toHaveProperty("pseudonym", "TestPseudo");
      expect(testEntry!.volunteer).toHaveProperty("pronouns", "she/her");
      expect(testEntry!.volunteer).toHaveProperty("phone", "555-1234");
      expect(testEntry!.volunteer).toHaveProperty("opt_in_communication", true);
      expect(testEntry!.volunteer).toHaveProperty(
        "notes",
        "Test structure notes"
      );
      expect(testEntry!.volunteer).toHaveProperty("created_at");
      expect(testEntry!.volunteer).toHaveProperty("updated_at");

      // Verify cohort properties
      expect(testEntry!.cohorts).toHaveLength(1);
      const cohortEntry = testEntry!.cohorts[0];
      expect(cohortEntry).toHaveProperty("id");
      expect(cohortEntry).toHaveProperty("term", "Fall");
      expect(cohortEntry).toHaveProperty("year", TEST_YEAR);
      expect(cohortEntry).toHaveProperty("is_active", true);
      expect(cohortEntry).toHaveProperty("created_at");

      // Verify role properties
      expect(testEntry!.roles).toHaveLength(1);
      const roleEntry = testEntry!.roles[0];
      expect(roleEntry).toHaveProperty("id");
      expect(roleEntry).toHaveProperty("name", "TEST_Role_Structure");
      expect(roleEntry).toHaveProperty("type", "current");
      expect(roleEntry).toHaveProperty("is_active", true);
      expect(roleEntry).toHaveProperty("created_at");
    });

    it("returns array conforming to VolunteerTableEntry type", async () => {
      const result = await getVolunteersTable();

      // Type check: result should be VolunteerTableEntry[]
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const entry: VolunteerTableEntry = result[0]!;
        expect(entry).toHaveProperty("volunteer");
        expect(entry).toHaveProperty("cohorts");
        expect(entry).toHaveProperty("roles");
        expect(Array.isArray(entry.cohorts)).toBe(true);
        expect(Array.isArray(entry.roles)).toBe(true);
      }
    });
  });
});
