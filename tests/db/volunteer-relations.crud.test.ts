import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createServiceTestClient,
  deleteWhere,
  deleteWhereGte,
  hasServiceRoleKey,
} from "../helpers";
import {
  makeTestVolunteerInsert,
  makeTestCohortInsert,
  makeTestRoleInsert,
  makeTestVolunteerCohortInsert,
  makeTestVolunteerRoleInsert,
  TEST_YEAR,
} from "../factories";

import { Database } from "@/lib/client/supabase/types";
type VolunteerRow = Database["public"]["Tables"]["Volunteers"]["Row"];
type CohortRow = Database["public"]["Tables"]["Cohorts"]["Row"];
type VolunteerCohortsRow =
  Database["public"]["Tables"]["VolunteerCohorts"]["Row"];
type VolunteerRolesRow = Database["public"]["Tables"]["VolunteerRoles"]["Row"];
type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];

type VolunteerCohortsWithJoins = VolunteerCohortsRow & {
  Volunteers: VolunteerRow | null;
  Cohorts: CohortRow | null;
};

type VolunteerRolesWithJoins = VolunteerRolesRow & {
  Volunteers: VolunteerRow | null;
  Roles: RoleRow | null;
};

const describeDb = hasServiceRoleKey() ? describe : describe.skip;

describeDb("db: VolunteerCohorts junction table (integration)", () => {
  const client = createServiceTestClient();

  // Clean up database records before and after each test
  beforeEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });
  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  it("links a volunteer to a cohort", async () => {
    const volunteerInsert = makeTestVolunteerInsert();
    const cohortInsert = makeTestCohortInsert();

    const { data: volunteer } = await client
      .from("Volunteers")
      .insert(volunteerInsert)
      .select()
      .single();

    const { data: cohort } = await client
      .from("Cohorts")
      .insert(cohortInsert)
      .select()
      .single();

    // Create the junction record between the volunteer and the cohort
    const linkInsert = makeTestVolunteerCohortInsert(volunteer!.id, cohort!.id);
    const { data: link, error } = await client
      .from("VolunteerCohorts")
      .insert(linkInsert)
      .select()
      .single();

    expect(error).toBeNull();
    expect(link!.volunteer_id).toBe(volunteer!.id);
    expect(link!.cohort_id).toBe(cohort!.id);
  });

  it("can query volunteers with their cohorts using joins", async () => {
    // Use unique prefix to avoid cleanup race conditions with parallel tests
    const uniquePrefix = `TEST_joins_${Date.now()}`;

    const volunteerInsert = makeTestVolunteerInsert({
      name_org: `${uniquePrefix}_vol`,
    });
    const cohortInsert = makeTestCohortInsert({
      term: "Fall",
      year: TEST_YEAR,
    });

    const { data: volunteer, error: volunteerError } = await client
      .from("Volunteers")
      .insert(volunteerInsert)
      .select()
      .single();

    expect(volunteerError).toBeNull();
    expect(volunteer).toBeTruthy();

    const { data: cohort, error: cohortError } = await client
      .from("Cohorts")
      .insert(cohortInsert)
      .select()
      .single();

    expect(cohortError).toBeNull();
    expect(cohort).toBeTruthy();

    const { error: linkError } = await client
      .from("VolunteerCohorts")
      .insert(makeTestVolunteerCohortInsert(volunteer!.id, cohort!.id));

    expect(linkError).toBeNull();

    // Query with joins to get the volunteer and cohort
    const { data, error } = await client
      .from("VolunteerCohorts")
      .select("*, Volunteers(*), Cohorts(*)")
      .eq("volunteer_id", volunteer!.id)
      .returns<VolunteerCohortsWithJoins[]>()
      .single();

    expect(error).toBeNull();
    expect(data!.Volunteers).toBeTruthy();
    expect(data!.Cohorts).toBeTruthy();
    expect(data!.Cohorts!.term).toBe("Fall");

    // Clean up this specific test's data
    await client.from("Volunteers").delete().eq("id", volunteer!.id);
    await client.from("Cohorts").delete().eq("id", cohort!.id);
  });

  it("cascades delete when volunteer is deleted", async () => {
    const volunteerInsert = makeTestVolunteerInsert();
    const cohortInsert = makeTestCohortInsert();

    const { data: volunteer } = await client
      .from("Volunteers")
      .insert(volunteerInsert)
      .select()
      .single();

    const { data: cohort } = await client
      .from("Cohorts")
      .insert(cohortInsert)
      .select()
      .single();

    await client
      .from("VolunteerCohorts")
      .insert(makeTestVolunteerCohortInsert(volunteer!.id, cohort!.id));

    // Delete the volunteer
    await client.from("Volunteers").delete().eq("id", volunteer!.id);

    // Related records should be deleted as well
    const { data: links } = await client
      .from("VolunteerCohorts")
      .select()
      .eq("volunteer_id", volunteer!.id);

    expect(links).toHaveLength(0);
  });

  it("allows a volunteer to belong to multiple cohorts", async () => {
    const volunteerInsert = makeTestVolunteerInsert();
    const cohort1Insert = makeTestCohortInsert({
      term: "Fall",
      year: TEST_YEAR,
    });
    const cohort2Insert = makeTestCohortInsert({
      term: "Spring",
      year: TEST_YEAR,
    });

    const { data: volunteer } = await client
      .from("Volunteers")
      .insert(volunteerInsert)
      .select()
      .single();

    const { data: cohort1 } = await client
      .from("Cohorts")
      .insert(cohort1Insert)
      .select()
      .single();

    const { data: cohort2 } = await client
      .from("Cohorts")
      .insert(cohort2Insert)
      .select()
      .single();

    // Link to both cohorts
    await client
      .from("VolunteerCohorts")
      .insert([
        makeTestVolunteerCohortInsert(volunteer!.id, cohort1!.id),
        makeTestVolunteerCohortInsert(volunteer!.id, cohort2!.id),
      ]);

    const { data: links, error } = await client
      .from("VolunteerCohorts")
      .select()
      .eq("volunteer_id", volunteer!.id);

    expect(error).toBeNull();
    expect(links).toHaveLength(2);
  });
});

describeDb("db: VolunteerRoles junction table (integration)", () => {
  const client = createServiceTestClient();

  beforeEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    await deleteWhere(client, "Roles", "name", "TEST_%");
  });

  it("links a volunteer to a role", async () => {
    const volunteerInsert = makeTestVolunteerInsert();
    const roleInsert = makeTestRoleInsert();

    const { data: volunteer } = await client
      .from("Volunteers")
      .insert(volunteerInsert)
      .select()
      .single();

    const { data: role } = await client
      .from("Roles")
      .insert(roleInsert)
      .select()
      .single();

    const linkInsert = makeTestVolunteerRoleInsert(volunteer!.id, role!.id);
    const { data: link, error } = await client
      .from("VolunteerRoles")
      .insert(linkInsert)
      .select()
      .single();

    expect(error).toBeNull();
    expect(link!.volunteer_id).toBe(volunteer!.id);
    expect(link!.role_id).toBe(role!.id);
  });

  it("can query volunteers with their roles using joins", async () => {
    const volunteerInsert = makeTestVolunteerInsert();
    const roleInsert = makeTestRoleInsert({
      name: "TEST_Coordinator",
      type: "current",
    });

    const { data: volunteer } = await client
      .from("Volunteers")
      .insert(volunteerInsert)
      .select()
      .single();

    const { data: role } = await client
      .from("Roles")
      .insert(roleInsert)
      .select()
      .single();

    await client
      .from("VolunteerRoles")
      .insert(makeTestVolunteerRoleInsert(volunteer!.id, role!.id));

    const { data, error } = await client
      .from("VolunteerRoles")
      .select("*, Volunteers(*), Roles(*)")
      .eq("volunteer_id", volunteer!.id)
      .returns<VolunteerRolesWithJoins[]>()
      .single();

    expect(error).toBeNull();
    expect(data!.Roles).toBeTruthy();
    expect(data!.Roles!.name).toBe("TEST_Coordinator");
  });

  it("allows a volunteer to have multiple roles", async () => {
    const volunteerInsert = makeTestVolunteerInsert();
    const role1Insert = makeTestRoleInsert({ name: "TEST_Role1" });
    const role2Insert = makeTestRoleInsert({ name: "TEST_Role2" });

    const { data: volunteer } = await client
      .from("Volunteers")
      .insert(volunteerInsert)
      .select()
      .single();

    const { data: role1 } = await client
      .from("Roles")
      .insert(role1Insert)
      .select()
      .single();

    const { data: role2 } = await client
      .from("Roles")
      .insert(role2Insert)
      .select()
      .single();

    await client
      .from("VolunteerRoles")
      .insert([
        makeTestVolunteerRoleInsert(volunteer!.id, role1!.id),
        makeTestVolunteerRoleInsert(volunteer!.id, role2!.id),
      ]);

    const { data: links, error } = await client
      .from("VolunteerRoles")
      .select()
      .eq("volunteer_id", volunteer!.id);

    expect(error).toBeNull();
    expect(links).toHaveLength(2);
  });

  it("cascades delete when volunteer is deleted", async () => {
    const volunteerInsert = makeTestVolunteerInsert();
    const roleInsert = makeTestRoleInsert();

    const { data: volunteer } = await client
      .from("Volunteers")
      .insert(volunteerInsert)
      .select()
      .single();

    const { data: role } = await client
      .from("Roles")
      .insert(roleInsert)
      .select()
      .single();

    await client
      .from("VolunteerRoles")
      .insert(makeTestVolunteerRoleInsert(volunteer!.id, role!.id));

    // Delete the volunteer
    await client.from("Volunteers").delete().eq("id", volunteer!.id);

    // Related records should be deleted as well
    const { data: links } = await client
      .from("VolunteerRoles")
      .select()
      .eq("volunteer_id", volunteer!.id);

    expect(links).toHaveLength(0);
  });
});
