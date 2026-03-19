import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { import_csv } from "@/lib/api";
import {
  createServiceTestClient,
  deleteWhere,
  deleteWhereGte,
} from "../support/helpers";

const header =
  "VOLUNTEER,PRONOUNS,POSITION,COHORT,EMAIL,PHONE,IZZY,ACCOMPANIMENT,CHAT,F2F,FRONT DESK,GRANTS,TRAINING TEAM,BOARD MEMBER,NOTES (copied from prior traning sheet)";

type VolunteerCsvRow = {
  name: string;
  pronouns: string;
  position: string;
  cohort: string;
  email: string;
  phone: string;
  notes: string;
  roles?: {
    accompaniment?: string;
    chat?: string;
    f2f?: string;
    frontDesk?: string;
    grants?: string;
    trainingTeam?: string;
    boardMember?: string;
  };
};

function buildVolunteerStrCSV(rows: VolunteerCsvRow[]): string {
  // Map position values to CSV values
  const positionValueToCsv = (val: string): string => {
    switch (val.toLowerCase()) {
      case "ebu":
        return "3. EBU";
      case "staff":
        return "4. Staff";
      case "cl1":
        return "1. CL (First Year)";
      case "cl2":
        return "2. CL (1+ Years)";
      case "training":
        return "0. Training";
      default:
        return val;
    }
  };

  // Map role values to CSV values
  const roleValueToCsv = (val?: string): string => {
    switch ((val || "").toLowerCase()) {
      case "active":
        return "1. Active";
      case "prior":
        return "2. Prior";
      case "interested":
        return "3.Interested";
      case "no":
        return "4. No";
      case "blank":
        return "";
      default:
        return val || "";
    }
  };

  const dataRows = rows.map(
    ({ name, pronouns, position, cohort, email, phone, notes, roles = {} }) => {
      const roleColumns = [
        roleValueToCsv(roles.accompaniment),
        roleValueToCsv(roles.chat),
        roleValueToCsv(roles.f2f),
        roleValueToCsv(roles.frontDesk),
        roleValueToCsv(roles.grants),
        roleValueToCsv(roles.trainingTeam),
        roleValueToCsv(roles.boardMember),
      ];
      return [
        name,
        pronouns,
        positionValueToCsv(position),
        cohort,
        email,
        phone,
        "1. YES",
        ...roleColumns,
        notes,
      ].join(",");
    }
  );

  return [header, ...dataRows].join("\n");
}

describe("db: import_csv (integration)", () => {
  const client = createServiceTestClient();

  // Unique prefix for this test suite run
  const TEST_NAME_PREFIX = `import_test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const TEST_YEAR = 6769;
  const ROLE_NAMES_TO_DELETE = [
    "Accompaniment",
    "Chat Counsellor",
    "F2F",
    "Front Desk",
    "Grants",
    "Training Team",
    "Board Member",
    "Crisis Line Counsellor",
    "Emergency Back-up",
  ];

  beforeEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", TEST_NAME_PREFIX + "%");
    for (const name of ROLE_NAMES_TO_DELETE) {
      await deleteWhere(client, "Roles", "name", name);
    }
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", TEST_NAME_PREFIX + "%");
    for (const name of ROLE_NAMES_TO_DELETE) {
      await deleteWhere(client, "Roles", "name", name);
    }
    await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
  });

  it("imports a Staff row with real role values and creates volunteer/cohort/role links", async () => {
    // Position "4. Staff" -> position=staff, no role from position column
    // Accompaniment "1. Active"  role Accompaniment/current
    // Chat "4. No" -> skip (not a parse error)
    // F2F "2. Prior" -> role F2F/prior
    // All other role columns are blank -> skip
    const volunteerName = `${TEST_NAME_PREFIX}_valid`;

    const volunteerData = {
      name: volunteerName,
      pronouns: "she/her",
      position: "staff",
      cohort: `${TEST_YEAR} Fall`,
      email: "test_import_valid@example.com",
      phone: "555-0101",
      roles: {
        accompaniment: "active",
        chat: "no",
        f2f: "prior",
        frontDesk: "blank",
        grants: "blank",
        trainingTeam: "blank",
        boardMember: "blank",
      },
      notes: "Integration note",
    };

    const csv = buildVolunteerStrCSV([volunteerData]);
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
      .eq("name_org", volunteerName)
      .single();

    expect(volunteerError).toBeNull();
    expect(volunteer).toBeTruthy();
    expect(volunteer!.position).toBe("staff");
    expect(volunteer!.email).toBe("test_import_valid@example.com");
    expect(volunteer!.notes).toBe("Integration note");

    const { data: volunteerCohorts, error: vcError } = await client
      .from("VolunteerCohorts")
      .select("volunteer_id, Cohorts!inner(year, term)")
      .eq("volunteer_id", volunteer!.id)
      .single();

    expect(vcError).toBeNull();
    const cohort = (
      volunteerCohorts! as { Cohorts: { year: number; term: string } }
    ).Cohorts;

    expect(cohort.year).toBe(TEST_YEAR);
    expect(cohort.term).toBe("Fall");

    const { data: volunteerRoles, error: vrError } = await client
      .from("VolunteerRoles")
      .select("volunteer_id, Roles!inner(name, type)")
      .eq("volunteer_id", volunteer!.id);

    expect(vrError).toBeNull();
    expect(volunteerRoles).toBeTruthy();

    const rolePairs = volunteerRoles!.map(
      (row) => (row as { Roles: { name: string; type: string } }).Roles
    );

    expect(rolePairs.length).toEqual(2);
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

    // Assert that roles Accompaniment and F2F with all types exist in Roles table
    const roleNames = ["Accompaniment", "F2F"];
    const roleTypes = ["current", "prior", "future_interest"];
    for (const name of roleNames) {
      for (const type of roleTypes) {
        const { data: roleRow, error: roleError } = await client
          .from("Roles")
          .select("id, name, type")
          .eq("name", name)
          .eq("type", type)
          .eq("is_active", true)
          .single();
        expect(roleError).toBeNull();
        expect(roleRow).toBeTruthy();
        expect(roleRow!.name).toBe(name);
        expect(roleRow!.type).toBe(type);
      }
    }
  });

  it("imports a CL row and attaches Crisis Line Counsellor role from position column", async () => {
    // Position "1. CL (First Year)" contains "CL" -> role Crisis Line Counsellor/current, position=volunteer
    // Accompaniment "3.Interested" -> role Accompaniment/future_interest
    // All other role columns "4. No" -> skip
    const volunteerName = `${TEST_NAME_PREFIX}_cl`;

    const volunteerData = {
      name: volunteerName,
      pronouns: "she/her",
      position: "cl1",
      cohort: `${TEST_YEAR} Summer`,
      email: "test_import_cl@example.com",
      phone: "555-0107",
      roles: {
        accompaniment: "interested",
        chat: "no",
        f2f: "no",
        frontDesk: "no",
        grants: "no",
        trainingTeam: "no",
        boardMember: "no",
      },
      notes: "",
    };

    const csv = buildVolunteerStrCSV([volunteerData]);
    const response = await import_csv(csv);

    expect(response.status).toBe("success");
    expect(response.summary.totalRows).toBe(1);
    expect(response.summary.parsedSucceeded).toBe(1);
    expect(response.summary.parseFailed).toBe(0);
    expect(response.summary.dbSucceeded).toBe(1);
    expect(response.summary.dbFailed).toBe(0);
    expect(response.parseErrors).toHaveLength(0);
    expect(response.dbErrors).toHaveLength(0);

    const { data: volunteer } = await client
      .from("Volunteers")
      .select("id, position")
      .eq("name_org", volunteerName)
      .single();

    expect(volunteer!.position).toBe("volunteer");

    const { data: volunteerRoles } = await client
      .from("VolunteerRoles")
      .select("Roles!inner(name, type)")
      .eq("volunteer_id", volunteer!.id);

    expect(volunteerRoles).toBeTruthy();
    const rolePairs = volunteerRoles!.map(
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
    // "INVALID POSITION" -> does not contain EBU/CL/Staff -> position parse error
    // "not-an-email" -> email parse error
    // "${TEST_YEAR} Monsoon" -> unrecognized season -> cohort parse error
    const TEST_POSITION_MUST_FAIL = "INVALID POSITION";

    const volunteerData = {
      name: "",
      pronouns: "they/them",
      position: `${TEST_POSITION_MUST_FAIL}`,
      cohort: `${TEST_YEAR} Monsoon`,
      email: "TEST_IMPORT_not-an-email",
      phone: "555-0102",
      roles: {
        accompaniment: "no",
        chat: "no",
        f2f: "no",
        frontDesk: "no",
        grants: "no",
        trainingTeam: "no",
        boardMember: "no",
      },
      notes: "",
    };

    const csv = buildVolunteerStrCSV([volunteerData]);
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

    const { data: volunteer } = await client
      .from("Volunteers")
      .select("id, position")
      .eq("TEST_IMPORT_CSV_not-an-email", "email")
      .single();

    expect(volunteer).toBeNull();
  });

  it("returns partial_success for mixed valid and invalid rows and inserts only the valid one", async () => {
    // Row 0: valid — "1. CL (First Year)" position, "3.Interested" in F2F, "4. No" elsewhere
    // Row 1: invalid — bad email; everything else valid
    const volunteerValid = `${TEST_NAME_PREFIX}_mixed_valid`;
    const volunteerInvalid = `${TEST_NAME_PREFIX}_mixed_invalid`;

    const volunteerData1 = {
      name: volunteerValid,
      pronouns: "they/them",
      position: "cl1",
      cohort: `${TEST_YEAR} Winter`,
      email: "test_import_mixed_valid@example.com",
      phone: "555-0103",
      roles: {
        accompaniment: "no",
        chat: "no",
        f2f: "interested",
        frontDesk: "no",
        grants: "no",
        trainingTeam: "no",
        boardMember: "no",
      },
      notes: "",
    };

    const volunteerData2 = {
      name: volunteerInvalid,
      pronouns: "she/her",
      position: "cl1",
      cohort: `${TEST_YEAR} Winter`,
      email: "bad-email",
      phone: "555-0104",
      roles: {
        accompaniment: "no",
        chat: "no",
        f2f: "interested",
        frontDesk: "no",
        grants: "no",
        trainingTeam: "no",
        boardMember: "no",
      },
      notes: "",
    };

    const csv = buildVolunteerStrCSV([volunteerData1, volunteerData2]);
    const response = await import_csv(csv);

    expect(response.status).toBe("partial_success");
    expect(response.summary.totalRows).toBe(2);
    expect(response.summary.parsedSucceeded).toBe(1);
    expect(response.summary.parseFailed).toBe(1);
    expect(response.summary.dbSucceeded).toBe(1);
    expect(response.summary.dbFailed).toBe(0);
    expect(response.parseErrors.every((e) => e.rowIndex === 1)).toBe(true);
    expect(response.parseErrors.some((e) => e.column === "email")).toBe(true);

    const { data: volunteers, error } = await client
      .from("Volunteers")
      .select("name_org")
      .like("name_org", `${TEST_NAME_PREFIX}_mixed_%`);

    expect(error).toBeNull();
    expect(volunteers).toHaveLength(1);
    expect(volunteers![0]?.name_org).toBe(`${TEST_NAME_PREFIX}_mixed_valid`);
  });

  it("records Papa Parse row errors and skips the malformed row from DB writes", async () => {
    // Row 0: valid — "3. EBU" position, "2. Prior" in chat, "4. No" elsewhere
    // Row 1: one extra field at the end triggers a Papa Parse TooManyFields error for that row
    const volunteerValid = `${TEST_NAME_PREFIX}_papa_valid`;
    const volunteerInvalid = `${TEST_NAME_PREFIX}_papa_bad`;
    const csv = [
      header,
      `${volunteerValid},they/them,3. EBU,${TEST_YEAR} Spring,test_import_papa_valid@example.com,555-0105,1. YES,4. No,2. Prior,4. No,4. No,4. No,4. No,4. No,`,
      `${volunteerInvalid},she/her,4. Staff,${TEST_YEAR} Spring,test_import_papa_bad@example.com,555-0106,1. YES,1. Active,4. No,4. No,4. No,4. No,4. No,4. No,,EXTRA`,
    ].join("\n");

    const response = await import_csv(csv);

    expect(response.summary.totalRows).toBe(2);
    expect(response.summary.dbSucceeded).toBe(1);
    expect(response.summary.parseFailed).toBe(1);
    expect(response.parseErrors.every((e) => e.rowIndex === 1)).toBe(true);
    expect(response.parseErrors.some((e) => typeof e.code === "string")).toBe(
      true
    );

    const { data: volunteers, error } = await client
      .from("Volunteers")
      .select("name_org")
      .in("name_org", [
        `${TEST_NAME_PREFIX}_papa_valid`,
        `${TEST_NAME_PREFIX}_papa_bad`,
      ]);

    expect(error).toBeNull();
    expect(volunteers).toHaveLength(1);
    expect(volunteers![0]?.name_org).toBe(`${TEST_NAME_PREFIX}_papa_valid`);
  });
});
