import { getVolunteersByRoles } from "@/lib/api";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createServiceTestClient,
  deleteWhere,
  DbClient,
} from "../support/helpers";
import {
  makeTestVolunteerRoleInsert,
  makeTestVolunteerInsert,
  makeTestRoleInsert,
  VolunteerInsert,
  RoleInsert,
  VolunteerRoleInsert,
} from "../support/factories"; // Your factory

function createTestRows(
  role_ids: number[],
  volunteer_ids: number[],
  volunteer_role_pairs: [number, number][]
): [RoleInsert[], VolunteerInsert[], VolunteerRoleInsert[]] {
  const role_rows = role_ids.map((id) =>
    makeTestRoleInsert({ id, name: "TEST_Role_" + id })
  );

  const volunteer_rows = volunteer_ids.map((id) =>
    makeTestVolunteerInsert({ id })
  );

  const volunteer_role_rows: VolunteerRoleInsert[] = [];
  for (const [volunteer_id, role_id] of volunteer_role_pairs) {
    volunteer_role_rows.push(
      makeTestVolunteerRoleInsert(volunteer_id, role_id)
    );
  }

  return [role_rows, volunteer_rows, volunteer_role_rows];
}

async function volunteerRoleSetup(
  client: DbClient,
  {
    role_ids,
    volunteer_ids,
    volunteer_role_pairs,
  }: {
    role_ids: number[];
    volunteer_ids: number[];
    volunteer_role_pairs: [number, number][];
  }
): Promise<void> {
  const [role_rows, volunteer_rows, volunteer_role_rows] = createTestRows(
    role_ids,
    volunteer_ids,
    volunteer_role_pairs
  );

  const { error: roles_error } = await client.from("Roles").insert(role_rows);
  expect(roles_error).toBeNull();

  const { error: volunteer_error } = await client
    .from("Volunteers")
    .insert(volunteer_rows);
  expect(volunteer_error).toBeNull();

  const { error: volunteer_roles_error } = await client
    .from("VolunteerRoles")
    .insert(volunteer_role_rows);
  expect(volunteer_roles_error).toBeNull();
}

describe("db: VolunteerRoles CRUD with getVolunteersByRoles (integration)", () => {
  const client = createServiceTestClient();

  beforeEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  it("returns all volunteers with TEST_Role_1 OR TEST_Role_2", async () => {
    const role_ids = [1, 2, 3]; // Role names should be "TEST_Role_1", "TEST_Role_2" and "TEST_Role_3"
    const volunteer_ids = [10, 20, 30];
    const volunteer_role_pairs: [number, number][] = [
      [10, 1],
      [20, 2],
      [30, 3],
      [10, 2],
    ];

    await volunteerRoleSetup(client, {
      role_ids,
      volunteer_ids,
      volunteer_role_pairs,
    }); // db assertion errors should ogate from this function

    const { data, status } = await getVolunteersByRoles("OR", [
      "TEST_Role_1",
      "TEST_Role_2",
    ]);

    expect(data).toBeTruthy();
    expect(status).toBe(200);

    const rolesByVolunteerId = new Map(
      data!.map((volunteer) => [volunteer.id, volunteer.filtered_roles])
    );

    expect([...rolesByVolunteerId.keys()]).toHaveLength(2);
    expect([...rolesByVolunteerId.keys()]).toEqual(
      expect.arrayContaining([10, 20])
    );

    expect(rolesByVolunteerId.get(10)).toHaveLength(2);
    expect(rolesByVolunteerId.get(10)).toEqual(
      expect.arrayContaining(["TEST_Role_1", "TEST_Role_2"])
    );

    expect(rolesByVolunteerId.get(20)).toHaveLength(1);
    expect(rolesByVolunteerId.get(20)).toEqual(
      expect.arrayContaining(["TEST_Role_2"])
    );
  });

  it("returns all volunteers with TEST_Role_1 AND TEST_Role_2", async () => {
    const role_ids = [1, 2, 3]; // Role names should be "TEST_Role_1", "TEST_Role_2" and "TEST_Role_3"
    const volunteer_ids = [10, 20, 30];
    const volunteer_role_pairs: [number, number][] = [
      [10, 1],
      [10, 2],
      [10, 3],
      [20, 2],
      [30, 2],
      [30, 3],
    ]; // [volunteer_id, role_id]

    await volunteerRoleSetup(client, {
      role_ids,
      volunteer_ids,
      volunteer_role_pairs,
    }); // db assertion errors should propogate from this function

    const { data, status } = await getVolunteersByRoles("AND", [
      "TEST_Role_1",
      "TEST_Role_2",
    ]);

    expect(data).toBeTruthy();
    expect(status).toBe(200);

    const rolesByVolunteerId = new Map(
      data!.map((volunteer) => [volunteer.id, volunteer.filtered_roles])
    );

    expect([...rolesByVolunteerId.keys()]).toHaveLength(1);
    expect([...rolesByVolunteerId.keys()]).toEqual(
      expect.arrayContaining([10])
    );

    expect(rolesByVolunteerId.get(10)).toHaveLength(2);
    expect(rolesByVolunteerId.get(10)).toEqual(
      expect.arrayContaining(["TEST_Role_1", "TEST_Role_2"])
    );
  });

  it("returns all volunteers with role TEST_Role_1", async () => {
    const role_ids = [1, 2, 3]; // Role names should be "TEST_Role_1", "TEST_Role_2" and "TEST_Role_3"
    const volunteer_ids = [10, 20, 30];
    const volunteer_role_pairs: [number, number][] = [
      [10, 1],
      [10, 2],
      [20, 2],
      [30, 1],
      [30, 3],
    ];

    await volunteerRoleSetup(client, {
      role_ids,
      volunteer_ids,
      volunteer_role_pairs,
    }); // db insertion errors should propogate from this function

    const { data, status } = await getVolunteersByRoles("AND", ["TEST_Role_1"]);

    expect(data).toBeTruthy();
    expect(status).toBe(200);

    const rolesByVolunteerId = new Map(
      data!.map((volunteer) => [volunteer.id, volunteer.filtered_roles])
    );

    expect([...rolesByVolunteerId.keys()]).toHaveLength(2);
    expect([...rolesByVolunteerId.keys()]).toEqual(
      expect.arrayContaining([10, 30])
    );

    expect(rolesByVolunteerId.get(10)).toHaveLength(1);
    expect(rolesByVolunteerId.get(10)).toEqual(
      expect.arrayContaining(["TEST_Role_1"])
    );

    expect(rolesByVolunteerId.get(30)).toHaveLength(1);
    expect(rolesByVolunteerId.get(30)).toEqual(
      expect.arrayContaining(["TEST_Role_1"])
    );
  });

  it("returns empty data array when no volunteers match filters", async () => {
    const role_ids = [1, 2, 3];
    const volunteer_ids = [10, 20, 30];
    const volunteer_role_pairs: [number, number][] = [
      [10, 2],
      [20, 2],
      [30, 3],
    ];

    await volunteerRoleSetup(client, {
      role_ids,
      volunteer_ids,
      volunteer_role_pairs,
    }); // db insertion errors should propogate from this function

    const { data, status } = await getVolunteersByRoles("AND", ["TEST_Role_1"]);

    expect(data).toHaveLength(0);
    expect(status).toBe(200);
  });

  it("returns empty data array when filters are empty and operator is OR", async () => {
    const { data, status } = await getVolunteersByRoles("OR", []);
    expect(data).toHaveLength(0);
    expect(status).toBe(200);
  });

  it("returns empty data array when filters are empty and operator is AND", async () => {
    const { data, status } = await getVolunteersByRoles("AND", []);
    expect(data).toHaveLength(0);
    expect(status).toBe(200);
  });
});
