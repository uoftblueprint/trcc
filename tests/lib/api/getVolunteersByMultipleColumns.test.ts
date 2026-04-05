import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import {
  makeTestVolunteerInsert,
  makeTestRoleInsert,
  makeTestVolunteerRoleInsert,
  makeTestCohortInsert,
  makeTestVolunteerCohortInsert,
  TEST_YEAR,
} from "../support/factories";
import {
  getVolunteersByMultipleColumns,
  validateMultipleColumnFilter,
  type FilterTuple,
} from "@/lib/api/getVolunteersByMultipleColumns";

// Unit tests
describe("validateMultipleColumnFilter (unit)", () => {
  it("accepts a valid filter", async () => {
    const filtersList: FilterTuple[] = [
      { field: "current_roles", miniOp: "OR", values: ["Role 1"] },
      { field: "cohorts", miniOp: "AND", values: [["Winter", "2025"]] },
      { field: "name_org", miniOp: "OR", values: ["Volunteer1, Volunteer2"] },
    ];
    const result = await validateMultipleColumnFilter(filtersList, "AND");
    expect(result.valid).toBe(true);
  });

  it("rejects non-array filters", async () => {
    // @ts-expect-error Test invalid filter array type
    const result = await validateMultipleColumnFilter(null, "AND");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/must be an array/);
  });

  it("rejects invalid global operations", async () => {
    const result = await validateMultipleColumnFilter([], "NOT");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/Invalid global operation/);
  });

  it("rejects any invalid mini operations", async () => {
    const filtersList: FilterTuple[] = [
      { field: "current_roles", miniOp: "OR", values: ["Role 1"] },
      // @ts-expect-error Test invalid mini operation type
      { field: "cohorts", miniOp: "XOR", values: [["Winter", "2025"]] },
    ];
    const result = await validateMultipleColumnFilter(filtersList, "OR");
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error).toMatch(/Invalid filter mini-operation/);
  });

  it("rejects invalid filter field", async () => {
    const filtersList: FilterTuple[] = [
      { field: "invalid_field", miniOp: "OR", values: ["Role 1"] },
    ];
    const result = await validateMultipleColumnFilter(filtersList, "OR");
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error).toMatch(/Invalid filter field name/);
  });

  it("accepts contact_incomplete shortcut filter", async () => {
    const filtersList: FilterTuple[] = [
      { field: "contact_incomplete", miniOp: "OR", values: ["true"] },
    ];
    const result = await validateMultipleColumnFilter(filtersList, "AND");
    expect(result.valid).toBe(true);
  });

  it("rejects invalid contact_incomplete values", async () => {
    const filtersList: FilterTuple[] = [
      { field: "contact_incomplete", miniOp: "OR", values: ["no"] },
    ];
    const result = await validateMultipleColumnFilter(filtersList, "AND");
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error).toMatch(/Invalid contact_incomplete/);
  });

  it("rejects invalid values array", async () => {
    const filtersList: FilterTuple[] = [
      { field: "prior_roles", miniOp: "OR", values: [] },
    ];
    const result = await validateMultipleColumnFilter(filtersList, "OR");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/Invalid filter values/);
  });

  it("rejects any invalid cohort value", async () => {
    const filtersList: FilterTuple[] = [
      {
        field: "cohorts",
        miniOp: "OR",
        values: [
          ["Winter", "2025"],
          ["Spring", "Year"],
        ],
      },
    ];
    const result = await validateMultipleColumnFilter(filtersList, "OR");
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error).toMatch(/Invalid cohort filter values/);
  });

  it("rejects any invalid general or role value", async () => {
    const filtersList: FilterTuple[] = [
      // @ts-expect-error Test invalid value type
      { field: "name_org", miniOp: "OR", values: ["Volunteer 1", null] },
    ];
    const result = await validateMultipleColumnFilter(filtersList, "OR");
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.error).toMatch(/Invalid general or role filter values/);
  });
});

// Integration tests
describe("getVolunteersByMultipleColumns (integration)", () => {
  const client = createServiceTestClient();

  let volunteer1Id: number; // Role 1, Cohort 1
  let volunteer2Id: number; // Role 2, Cohort 1, Cohort 2
  let volunteer3Id: number; // Role 1, Role 2, Cohort 2
  let role1Id: number, role2Id: number, role3Id: number, role4Id: number;
  let cohort1Id: number, cohort2Id: number;

  beforeAll(async () => {
    // Clean up any existing test data first to prevent unique constraint violations
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
    await client.from("Cohorts").delete().eq("year", TEST_YEAR);

    const { data: v, error: vError } = await client
      .from("Volunteers")
      .insert([
        makeTestVolunteerInsert({
          name_org: "TEST_Volunteer1",
          position: "volunteer",
        }),
        makeTestVolunteerInsert({
          name_org: "TEST_Volunteer2",
          position: "volunteer",
        }),
        makeTestVolunteerInsert({
          name_org: "TEST_Volunteer3",
          position: "member",
        }),
      ])
      .select();

    const { data: r, error: rError } = await client
      .from("Roles")
      .insert([
        makeTestRoleInsert({ name: "TEST_Role1" }),
        makeTestRoleInsert({ name: "TEST_Role2" }),
        makeTestRoleInsert({ name: "TEST_Role3", type: "prior" }),
        makeTestRoleInsert({ name: "TEST_Role4", type: "future_interest" }),
      ])
      .select();

    const { data: c, error: cError } = await client
      .from("Cohorts")
      .insert([
        makeTestCohortInsert({ term: "Fall" }),
        makeTestCohortInsert({ term: "Winter" }),
      ])
      .select();

    expect(vError).toBeNull();
    expect(rError).toBeNull();
    expect(cError).toBeNull();

    const [v1, v2, v3] = v!;
    volunteer1Id = v1!.id;
    volunteer2Id = v2!.id;
    volunteer3Id = v3!.id;

    const [r1, r2, r3, r4] = r!;
    role1Id = r1!.id;
    role2Id = r2!.id;
    role3Id = r3!.id;
    role4Id = r4!.id;

    const [c1, c2] = c!;
    cohort1Id = c1!.id;
    cohort2Id = c2!.id;

    const { error: vrError } = await client
      .from("VolunteerRoles")
      .insert([
        makeTestVolunteerRoleInsert(volunteer1Id, role1Id),
        makeTestVolunteerRoleInsert(volunteer1Id, role3Id),
        makeTestVolunteerRoleInsert(volunteer3Id, role1Id),
        makeTestVolunteerRoleInsert(volunteer2Id, role4Id),
        makeTestVolunteerRoleInsert(volunteer2Id, role2Id),
        makeTestVolunteerRoleInsert(volunteer3Id, role2Id),
        makeTestVolunteerRoleInsert(volunteer3Id, role3Id),
        makeTestVolunteerRoleInsert(volunteer3Id, role4Id),
      ]);

    const { error: vcError } = await client
      .from("VolunteerCohorts")
      .insert([
        makeTestVolunteerCohortInsert(volunteer1Id, cohort1Id),
        makeTestVolunteerCohortInsert(volunteer2Id, cohort1Id),
        makeTestVolunteerCohortInsert(volunteer2Id, cohort2Id),
        makeTestVolunteerCohortInsert(volunteer3Id, cohort2Id),
      ]);

    expect(vrError).toBeNull();
    expect(vcError).toBeNull();
  });

  afterAll(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
    await client.from("Cohorts").delete().eq("year", TEST_YEAR);
  });

  it("returns nothing when filters are empty", async () => {
    const result = await getVolunteersByMultipleColumns([], "AND");
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([]);
  });

  it("filters by role with OR", async () => {
    const filters: FilterTuple[] = [
      { field: "current_roles", miniOp: "OR", values: ["TEST_Role1"] },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "AND");
    const ids = data;

    expect(ids).toContain(volunteer1Id);
    expect(ids).toContain(volunteer3Id);
    expect(ids).not.toContain(volunteer2Id);
  });

  it("filters by role with AND", async () => {
    const filters: FilterTuple[] = [
      {
        field: "current_roles",
        miniOp: "AND",
        values: ["TEST_Role1", "TEST_Role2"],
      },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "AND");
    const ids = data;

    expect(ids).toContain(volunteer3Id);
    expect(ids).not.toContain(volunteer1Id);
    expect(ids).not.toContain(volunteer2Id);
  });

  it("filters by prior_roles", async () => {
    const filters: FilterTuple[] = [
      { field: "prior_roles", miniOp: "OR", values: ["TEST_Role3"] },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "AND");
    const ids = data;

    expect(ids).toContain(volunteer1Id);
    expect(ids).toContain(volunteer3Id);
    expect(ids).not.toContain(volunteer2Id);
  });

  it("filters by future_interests", async () => {
    const filters: FilterTuple[] = [
      { field: "future_interests", miniOp: "OR", values: ["TEST_Role4"] },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "AND");
    const ids = data;

    expect(ids).toContain(volunteer2Id);
    expect(ids).toContain(volunteer3Id);
    expect(ids).not.toContain(volunteer1Id);
  });

  it("cohorts by cohort with OR", async () => {
    const filters: FilterTuple[] = [
      { field: "cohorts", miniOp: "OR", values: [["Fall", String(TEST_YEAR)]] },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "AND");
    const ids = data;

    expect(ids).toContain(volunteer1Id);
    expect(ids).toContain(volunteer2Id);
    expect(ids).not.toContain(volunteer3Id);
  });

  it("filters by cohort with AND", async () => {
    const filters: FilterTuple[] = [
      {
        field: "cohorts",
        miniOp: "AND",
        values: [
          ["Fall", String(TEST_YEAR)],
          ["Winter", String(TEST_YEAR)],
        ],
      },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "AND");
    const ids = data;

    expect(ids).toContain(volunteer2Id);
    expect(ids).not.toContain(volunteer1Id);
    expect(ids).not.toContain(volunteer3Id);
  });

  it("filters by general", async () => {
    const filters: FilterTuple[] = [
      { field: "position", miniOp: "AND", values: ["member"] },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "AND");
    const ids = data;

    expect(ids).toContain(volunteer3Id);
    expect(ids).not.toContain(volunteer1Id);
    expect(ids).not.toContain(volunteer2Id);
  });

  it("handles AND general filters", async () => {
    const filters: FilterTuple[] = [
      { field: "position", miniOp: "AND", values: ["member", "volunteer"] },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "AND");
    expect(data).toHaveLength(0);
  });

  it("filters by global AND", async () => {
    const filters: FilterTuple[] = [
      {
        field: "current_roles",
        miniOp: "AND",
        values: ["TEST_Role2"],
      },
      {
        field: "cohorts",
        miniOp: "OR",
        values: [
          ["Fall", String(TEST_YEAR)],
          ["Winter", String(TEST_YEAR)],
        ],
      },
      {
        field: "name_org",
        miniOp: "OR",
        values: ["TEST_Volunteer2"],
      },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "AND");
    const ids = data;

    expect(ids).toContain(volunteer2Id);
    expect(ids).not.toContain(volunteer1Id);
    expect(ids).not.toContain(volunteer3Id);
  });

  it("filters by global OR", async () => {
    const filters: FilterTuple[] = [
      { field: "position", miniOp: "OR", values: ["member"] },
      {
        field: "cohorts",
        miniOp: "OR",
        values: [["Winter", String(TEST_YEAR)]],
      },
    ];
    const { data } = await getVolunteersByMultipleColumns(filters, "OR");
    const ids = data;

    expect(ids).toContain(volunteer2Id);
    expect(ids).toContain(volunteer3Id);
    expect(ids).not.toContain(volunteer1Id);
  });
});
