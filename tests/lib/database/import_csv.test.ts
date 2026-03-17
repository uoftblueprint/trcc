import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { import_csv } from "@/lib/api";
import {
  createServiceTestClient,
  deleteWhere,
  deleteWhereGte,
} from "../support/helpers";

describe("db: import_csv (integration)", () => {
  const client = createServiceTestClient();
  const TEST_NAME_PREFIX = "TEST_IMPORT_%";
  const TEST_YEAR = 6769;

  // Matches real CSV column layout: 15 columns
  // VOLUNTEER,PRONOUNS,POSITION,COHORT,EMAIL,PHONE,IZZY,ACCOMPANIMENT,CHAT,F2F,FRONT DESK,GRANTS,TRAINING TEAM,BOARD MEMBER,NOTES (copied from prior traning sheet)
  const header =
    "VOLUNTEER,PRONOUNS,POSITION,COHORT,EMAIL,PHONE,IZZY,ACCOMPANIMENT,CHAT,F2F,FRONT DESK,GRANTS,TRAINING TEAM,BOARD MEMBER,NOTES (copied from prior traning sheet)";

  beforeEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", TEST_NAME_PREFIX);
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", TEST_NAME_PREFIX);
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  it("imports a Staff row with real role values and creates volunteer/cohort/role links", async () => {
    // Position "4. Staff" -> position=staff, no role from position column
    // Accompaniment "1. Active"  role Accompaniment/current
    // Chat "4. No" -> skip (not a parse error)
    // F2F "2. Prior" -> role F2F/prior
    // All other role columns "4. No" -> skip
    const csv = [
      header,
      "TEST_IMPORT_valid,she/her,4. Staff,6769 Fall,test_import_valid@example.com,555-0101,1. YES,1. Active,4. No,2. Prior,4. No,4. No,4. No,4. No,Integration note",
    ].join("\n");

    const response = await import_csv(csv);

    expect(response.status).toBe("success");
    expect(response.summary.totalRows).toBe(1);
    expect(response.summary.parsedSucceeded).toBe(1);
    expect(response.summary.parseFailed).toBe(0);
    expect(response.summary.dbSucceeded).toBe(1);
    expect(response.summary.dbFailed).toBe(0);
    expect(response.parseErrors).toHaveLength(0);
    expect(response.dbErrors).toHaveLength(0);

    const { data: volunteer, error: volunteerError } = await client
      .from("Volunteers")
      .select("id, name_org, position, email, notes")
      .eq("name_org", "TEST_IMPORT_valid")
      .single();

    expect(volunteerError).toBeNull();
    expect(volunteer).toBeTruthy();
    expect(volunteer!.position).toBe("staff");
    expect(volunteer!.email).toBe("test_import_valid@example.com");
    expect(volunteer!.notes).toBe("Integration note");

    const { data: volunteerCohorts, error: vcError } = await client
      .from("VolunteerCohorts")
      .select("volunteer_id, Cohorts!inner(year, term)")
      .eq("volunteer_id", volunteer!.id);

    expect(vcError).toBeNull();
    expect(volunteerCohorts!.length).toBeGreaterThan(0);
    const cohort = (
      volunteerCohorts![0] as { Cohorts: { year: number; term: string } }
    ).Cohorts;
    expect(cohort.year).toBe(6769);
    expect(cohort.term).toBe("Fall");

    const { data: volunteerRoles, error: vrError } = await client
      .from("VolunteerRoles")
      .select("volunteer_id, Roles!inner(name, type)")
      .eq("volunteer_id", volunteer!.id);

    expect(vrError).toBeNull();
    const rolePairs = (volunteerRoles ?? []).map(
      (row) => (row as { Roles: { name: string; type: string } }).Roles
    );
    expect(rolePairs).toEqual(
      expect.arrayContaining([
        { name: "Accompaniment", type: "current" },
        { name: "F2F", type: "prior" },
      ])
    );
    // "4. No" on Chat should not produce a role
    expect(rolePairs).not.toEqual(
      expect.arrayContaining([{ name: "Chat Counsellor", type: "current" }])
    );
  });

  it("imports a CL row and attaches Crisis Line Counsellor role from position column", async () => {
    // Position "1. CL (First Year)" contains "CL" -> role Crisis Line Counsellor/current, position=volunteer
    // Accompaniment "3.Interested" -> role Accompaniment/future_interest
    // All other role columns "4. No" -> skip
    const csv = [
      header,
      "TEST_IMPORT_cl,she/her,1. CL (First Year),6769 Summer,test_import_cl@example.com,555-0107,1. YES,3.Interested,4. No,4. No,4. No,4. No,4. No,4. No,",
    ].join("\n");

    const response = await import_csv(csv);

    expect(response.status).toBe("success");
    expect(response.summary.parseFailed).toBe(0);
    expect(response.summary.dbSucceeded).toBe(1);

    const { data: volunteer } = await client
      .from("Volunteers")
      .select("id, position")
      .eq("name_org", "TEST_IMPORT_cl")
      .single();

    expect(volunteer!.position).toBe("volunteer");

    const { data: volunteerRoles } = await client
      .from("VolunteerRoles")
      .select("Roles!inner(name, type)")
      .eq("volunteer_id", volunteer!.id);

    const rolePairs = (volunteerRoles ?? []).map(
      (row) => (row as { Roles: { name: string; type: string } }).Roles
    );
    expect(rolePairs).toEqual(
      expect.arrayContaining([
        { name: "Crisis Line Counsellor", type: "current" },
        { name: "Accompaniment", type: "future_interest" },
      ])
    );
  });

  it("returns parse errors for a row missing name, with unrecognized position, invalid email, and bad cohort season", async () => {
    // Blank VOLUNTEER -> parse error (required)
    // "0. Training" -> does not contain EBU/CL/Staff -> position parse error
    // "not-an-email" -> email parse error
    // "6769 Monsoon" -> unrecognized season -> cohort parse error
    const csv = [
      header,
      ",they/them,0. Training,6769 Monsoon,not-an-email,555-0102,1. YES,4. No,4. No,4. No,4. No,4. No,4. No,4. No,",
    ].join("\n");

    const response = await import_csv(csv);

    expect(response.status).toBe("failed");
    expect(response.summary.totalRows).toBe(1);
    expect(response.summary.parsedSucceeded).toBe(0);
    expect(response.summary.parseFailed).toBeGreaterThan(0);
    expect(response.summary.dbSucceeded).toBe(0);
    expect(response.summary.dbFailed).toBe(0);
    expect(response.parseErrors.every((e) => e.rowIndex === 0)).toBe(true);
    expect(response.parseErrors.map((e) => e.column)).toEqual(
      expect.arrayContaining(["volunteer", "position", "email", "cohort"])
    );

    const { data: volunteers, error } = await client
      .from("Volunteers")
      .select("id")
      .like("name_org", TEST_NAME_PREFIX);

    expect(error).toBeNull();
    expect(volunteers).toHaveLength(0);
  });

  it("returns partial_success for mixed valid and invalid rows and inserts only the valid one", async () => {
    // Row 0: valid — "1. CL (First Year)" position, "3.Interested" in F2F, "4. No" elsewhere
    // Row 1: invalid — bad email; everything else valid
    const csv = [
      header,
      "TEST_IMPORT_mixed_valid,they/them,1. CL (First Year),6769 Winter,test_import_mixed_valid@example.com,555-0103,1. YES,4. No,4. No,3.Interested,4. No,4. No,4. No,4. No,",
      "TEST_IMPORT_mixed_invalid,she/her,1. CL (First Year),6769 Winter,bad-email,555-0104,1. YES,4. No,4. No,3.Interested,4. No,4. No,4. No,4. No,",
    ].join("\n");

    const response = await import_csv(csv);

    expect(response.status).toBe("partial_success");
    expect(response.summary.totalRows).toBe(2);
    expect(response.summary.parsedSucceeded).toBe(1);
    expect(response.summary.parseFailed).toBeGreaterThan(0);
    expect(response.summary.dbSucceeded).toBe(1);
    expect(response.summary.dbFailed).toBe(0);
    expect(response.parseErrors.some((e) => e.rowIndex === 1)).toBe(true);
    expect(response.parseErrors.some((e) => e.column === "email")).toBe(true);

    const { data: volunteers, error } = await client
      .from("Volunteers")
      .select("name_org")
      .like("name_org", "TEST_IMPORT_mixed_%");

    expect(error).toBeNull();
    expect(volunteers).toHaveLength(1);
    expect(volunteers![0]?.name_org).toBe("TEST_IMPORT_mixed_valid");
  });

  it("records Papa Parse row errors and skips the malformed row from DB writes", async () => {
    // Row 0: valid — "3. EBU" position, "2. Prior" in chat, "4. No" elsewhere
    // Row 1: one extra field at the end triggers a Papa Parse TooManyFields error for that row
    const csv = [
      header,
      "TEST_IMPORT_papa_valid,they/them,3. EBU,6769 Spring,test_import_papa_valid@example.com,555-0105,1. YES,4. No,2. Prior,4. No,4. No,4. No,4. No,4. No,",
      "TEST_IMPORT_papa_bad,she/her,4. Staff,6769 Spring,test_import_papa_bad@example.com,555-0106,1. YES,1. Active,4. No,4. No,4. No,4. No,4. No,4. No,,EXTRA",
    ].join("\n");

    const response = await import_csv(csv);

    expect(response.summary.totalRows).toBe(2);
    expect(response.summary.dbSucceeded).toBe(1);
    expect(response.summary.parseFailed).toBeGreaterThan(0);
    expect(response.parseErrors.some((e) => e.rowIndex === 1)).toBe(true);
    expect(response.parseErrors.some((e) => typeof e.code === "string")).toBe(
      true
    );

    const { data: volunteers, error } = await client
      .from("Volunteers")
      .select("name_org")
      .in("name_org", ["TEST_IMPORT_papa_valid", "TEST_IMPORT_papa_bad"]);

    expect(error).toBeNull();
    expect(volunteers).toHaveLength(1);
    expect(volunteers![0]?.name_org).toBe("TEST_IMPORT_papa_valid");
  });
});
