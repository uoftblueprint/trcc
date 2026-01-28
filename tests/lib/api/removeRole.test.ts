import { describe, it, expect, afterEach } from "vitest";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import {
  makeTestVolunteerInsert,
  makeTestRoleInsert,
  makeTestVolunteerRoleInsert,
} from "../support/factories";
import { removeRole } from "@/lib/api/removeRole";

describe("removeRole (integration)", () => {
  const client = createServiceTestClient();

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  it("rejects non-existent role", async () => {
    const roleName = "TEST_Role_1";
    const result = await removeRole(roleName);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/not found/);
  });

  it("removes unassigned role", async () => {
    const roleName = "TEST_Role_1";
    const { error: insertError } = await client
      .from("Roles")
      .insert([makeTestRoleInsert({ name: roleName })])
      .select();
    expect(insertError).toBeNull();

    const result = await removeRole(roleName);
    expect(result.success).toBe(true);

    const { data } = await client
      .from("Roles")
      .select("id")
      .eq("name", roleName);
    expect(data).toHaveLength(0);
  });

  it("removes assigned role and volunteer association", async () => {
    const roleName = "TEST_Role_1";

    const { data: volunteerInsertData, error: volunteerInsertError } =
      await client
        .from("Volunteers")
        .insert([
          makeTestVolunteerInsert({
            name_org: "TEST_Volunteer1",
            position: "volunteer",
          }),
        ])
        .select("id");
    expect(volunteerInsertError).toBeNull();
    const [volunteer] = volunteerInsertData!;
    const volunteerId = volunteer!.id;

    const { data: roleInsertData, error: roleInsertError } = await client
      .from("Roles")
      .insert([makeTestRoleInsert({ name: roleName })])
      .select("id");
    expect(roleInsertError).toBeNull();
    const [role] = roleInsertData!;
    const roleId = role!.id;

    const { error: volunteerRoleInsertError } = await client
      .from("VolunteerRoles")
      .insert([makeTestVolunteerRoleInsert(volunteerId, roleId)]);
    expect(volunteerRoleInsertError).toBeNull();

    const result = await removeRole(roleName);
    expect(result.success).toBe(true);

    const { data: roleSelectData } = await client
      .from("Roles")
      .select("id")
      .eq("name", roleName);
    expect(roleSelectData).toHaveLength(0);

    const { data: volunteerRoleSelectData } = await client
      .from("VolunteerRoles")
      .select("role_id")
      .eq("role_id", roleId);
    expect(volunteerRoleSelectData).toHaveLength(0);
  });

  it("removes only assigned role and many volunteer associations", async () => {
    const role1Name = "TEST_Role_1";
    const role2Name = "TEST_Role_2";

    const { data: volunteerInsertData, error: volunteerInsertError } =
      await client
        .from("Volunteers")
        .insert([
          makeTestVolunteerInsert({ name_org: "TEST_Volunteer1" }),
          makeTestVolunteerInsert({ name_org: "TEST_Volunteer2" }),
          makeTestVolunteerInsert({ name_org: "TEST_Volunteer3" }),
        ])
        .select("id");
    expect(volunteerInsertError).toBeNull();
    const [volunteer1, volunteer2, volunteer3] = volunteerInsertData!;
    const volunteer1Id = volunteer1!.id;
    const volunteer2Id = volunteer2!.id;
    const volunteer3Id = volunteer3!.id;

    const { data: roleInsertData, error: roleInsertError } = await client
      .from("Roles")
      .insert([
        makeTestRoleInsert({ name: role1Name }),
        makeTestRoleInsert({ name: role2Name }),
      ])
      .select("id");
    expect(roleInsertError).toBeNull();
    const [role1, role2] = roleInsertData!;
    const role1Id = role1!.id;
    const role2Id = role2!.id;

    const { error: volunteerRoleInsertError } = await client
      .from("VolunteerRoles")
      .insert([
        makeTestVolunteerRoleInsert(volunteer1Id, role1Id),
        makeTestVolunteerRoleInsert(volunteer2Id, role1Id),
        makeTestVolunteerRoleInsert(volunteer3Id, role2Id),
      ]);
    expect(volunteerRoleInsertError).toBeNull();

    const result = await removeRole(role1Name);
    expect(result.success).toBe(true);

    const { data: roleSelectData } = await client.from("Roles").select("id");
    expect(roleSelectData).toHaveLength(1);
    expect(roleSelectData![0]!.id).toBe(role2Id);

    const { data: volunteerRoleSelectData } = await client
      .from("VolunteerRoles")
      .select();
    expect(volunteerRoleSelectData).toHaveLength(1);
    expect(volunteerRoleSelectData![0]!.role_id === role2Id);
    expect(volunteerRoleSelectData![0]!.volunteer_id === volunteer3Id);
  });
});
