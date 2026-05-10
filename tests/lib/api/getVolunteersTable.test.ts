// Tests the API function that fetches all volunteers with their associated roles

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import {
  makeTestVolunteerInsert,
  makeTestRoleInsert,
  makeTestVolunteerRoleInsert,
} from "../support/factories";
import {
  getVolunteersTable,
  type VolunteerTableEntry,
} from "@/lib/api/getVolunteersTable";

describe("getVolunteersTable (integration)", () => {
  const client = createServiceTestClient();

  beforeEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  describe("empty results", () => {
    it("returns empty array when no volunteers exist", async () => {
      const result = await getVolunteersTable();
      const testResults = result.filter((entry) =>
        entry.volunteer.name_org.startsWith("TEST_")
      );
      expect(testResults).toEqual([]);
    });
  });

  describe("volunteer without relations", () => {
    it("returns volunteer with empty roles array", async () => {
      await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_NoRelations" }));

      const result = await getVolunteersTable();
      const testVolunteer = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_NoRelations"
      );

      expect(testVolunteer).toBeDefined();
      expect(testVolunteer!.volunteer.name_org).toBe("TEST_Vol_NoRelations");
      expect(testVolunteer!.roles).toEqual([]);
    });
  });

  describe("volunteer with training roles only", () => {
    it("returns volunteer with their associated training tags", async () => {
      const { data: role1 } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({ name: "TEST_Training_A", type: "training" })
        )
        .select()
        .single();

      const { data: role2 } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({ name: "TEST_Training_B", type: "training" })
        )
        .select()
        .single();

      const { data: vol } = await client
        .from("Volunteers")
        .insert(
          makeTestVolunteerInsert({ name_org: "TEST_Vol_WithTrainingTags" })
        )
        .select()
        .single();

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol!.id, role1!.id));

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol!.id, role2!.id));

      const result = await getVolunteersTable();
      const testVolunteer = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_WithTrainingTags"
      );

      expect(testVolunteer).toBeDefined();
      expect(testVolunteer!.roles).toHaveLength(2);
      const names = testVolunteer!.roles.map((r) => r.name);
      expect(names).toContain("TEST_Training_A");
      expect(names).toContain("TEST_Training_B");
      expect(testVolunteer!.roles.every((r) => r.type === "training")).toBe(
        true
      );
    });
  });

  describe("volunteer with non-training roles only", () => {
    it("returns volunteer with their associated roles", async () => {
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

      const { data: vol } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_WithRoles" }))
        .select()
        .single();

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
    });
  });

  describe("volunteer with training and other roles", () => {
    it("returns all linked roles in one array", async () => {
      const { data: t1 } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({ name: "TEST_Training_Fall", type: "training" })
        )
        .select()
        .single();

      const { data: t2 } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({
            name: "TEST_Training_Spring",
            type: "training",
          })
        )
        .select()
        .single();

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

      const { data: vol } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_Vol_FullRelations" }))
        .select()
        .single();

      for (const rid of [t1!.id, t2!.id, role1!.id, role2!.id]) {
        await client
          .from("VolunteerRoles")
          .insert(makeTestVolunteerRoleInsert(vol!.id, rid));
      }

      const result = await getVolunteersTable();
      const testVolunteer = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_FullRelations"
      );

      expect(testVolunteer).toBeDefined();
      expect(testVolunteer!.roles).toHaveLength(4);

      const training = testVolunteer!.roles.filter(
        (r) => r.type === "training"
      );
      expect(training.map((r) => r.name).sort()).toEqual([
        "TEST_Training_Fall",
        "TEST_Training_Spring",
      ]);

      const names = testVolunteer!.roles.map((r) => r.name);
      expect(names).toContain("TEST_Role_Facilitator");
      expect(names).toContain("TEST_Role_Support");
    });
  });

  describe("multiple volunteers", () => {
    it("returns all volunteers with their respective relations", async () => {
      const { data: trainingRole } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({
            name: "TEST_Role_Training_Shared",
            type: "training",
          })
        )
        .select()
        .single();

      const { data: currentRole } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({ name: "TEST_Role_Shared", type: "current" })
        )
        .select()
        .single();

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

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol1!.id, trainingRole!.id));
      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol1!.id, currentRole!.id));

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol2!.id, trainingRole!.id));

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol3!.id, currentRole!.id));

      const result = await getVolunteersTable();

      const testVol1 = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_Multi_1"
      );
      const testVol2 = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_Multi_2"
      );
      const testVol3 = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_Multi_3"
      );

      expect(testVol1).toBeDefined();
      expect(testVol1!.roles).toHaveLength(2);

      expect(testVol2).toBeDefined();
      expect(testVol2!.roles).toHaveLength(1);
      expect(testVol2!.roles[0]!.type).toBe("training");

      expect(testVol3).toBeDefined();
      expect(testVol3!.roles).toHaveLength(1);
      expect(testVol3!.roles[0]!.type).toBe("current");
    });
  });

  describe("return value structure", () => {
    it("returns VolunteerTableEntry objects with correct properties", async () => {
      const { data: training } = await client
        .from("Roles")
        .insert(
          makeTestRoleInsert({
            name: "TEST_Role_Training_Structure",
            type: "training",
            is_active: true,
          })
        )
        .select()
        .single();

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

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol!.id, training!.id));

      await client
        .from("VolunteerRoles")
        .insert(makeTestVolunteerRoleInsert(vol!.id, role!.id));

      const result = await getVolunteersTable();
      const testEntry = result.find(
        (entry) => entry.volunteer.name_org === "TEST_Vol_Structure"
      );

      expect(testEntry).toBeDefined();

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

      expect(testEntry!.roles).toHaveLength(2);

      const trainingEntry = testEntry!.roles.find(
        (r) => r.name === "TEST_Role_Training_Structure"
      );
      expect(trainingEntry).toBeDefined();
      expect(trainingEntry).toHaveProperty("type", "training");
      expect(trainingEntry).toHaveProperty("is_active", true);
      expect(trainingEntry).toHaveProperty("created_at");

      const roleEntry = testEntry!.roles.find(
        (r) => r.name === "TEST_Role_Structure"
      );
      expect(roleEntry).toBeDefined();
      expect(roleEntry).toHaveProperty("type", "current");
      expect(roleEntry).toHaveProperty("is_active", true);
      expect(roleEntry).toHaveProperty("created_at");
    });

    it("returns array conforming to VolunteerTableEntry type", async () => {
      const result = await getVolunteersTable();

      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const entry: VolunteerTableEntry = result[0]!;
        expect(entry).toHaveProperty("volunteer");
        expect(entry).toHaveProperty("roles");
        expect(Array.isArray(entry.roles)).toBe(true);
      }
    });
  });
});
