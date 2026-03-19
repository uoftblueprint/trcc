import Papa, { ParseResult } from "papaparse";
import { createClient } from "../client/supabase";
import { Tables } from "../client/supabase/types";

type ImportCSVStatus = "success" | "partial_success" | "failed";

type ImportCSVResponse = {
  status: ImportCSVStatus;
  summary: {
    totalRows: number;
    parsedSucceeded: number;
    parseFailed: number;
    dbSucceeded: number;
    dbFailed: number;
  };
  parseErrors: RowParseError[];
  dbErrors: RowDbError[];
};

// Expected column names in the raw csv file
enum RawCol {
  VOLUNTEER = "volunteer",
  PRONOUNS = "pronouns",
  PHONE = "phone",
  NOTES = "notes (copied from prior traning sheet)",
  EMAIL = "email",
  POSITION = "position",
  COHORT = "cohort",
  ACCOMPANIMENT = "accompaniment",
  CHAT = "chat",
  F2F = "f2f",
  FRONT_DESK = "front desk",
  GRANTS = "grants",
  TRAINING_TEAM = "training team",
  BOARD_MEMBER = "board member",
}

// Mapping of raw role types to new ones
const RAW_TO_VALID_ROLE_TYPE = new Map([
  ["interested", "future_interest"],
  ["active", "current"],
  ["prior", "prior"],
]);

// Used to map known raw role names to their new equivalent
const RAW_TO_VALID_ROLE_NAME: Record<string, string> = {
  [RawCol.ACCOMPANIMENT]: "Accompaniment",
  [RawCol.CHAT]: "Chat Counsellor",
  [RawCol.F2F]: "F2F",
  [RawCol.FRONT_DESK]: "Front Desk",
  [RawCol.GRANTS]: "Grants",
  [RawCol.TRAINING_TEAM]: "Training Team",
  [RawCol.BOARD_MEMBER]: "Board Member",
};

const VALID_COHORT_SEASONS = new Set(["Fall", "Winter", "Summer", "Spring"]);

type ParsedVolunteerBase = Omit<
  Tables<"Volunteers">,
  "created_at" | "id" | "opt_in_communication" | "pseudonym" | "updated_at"
>;

type ParsedVolunteer = ParsedVolunteerBase & {
  index: number;
  cohort: { year: number; season: string } | null;
  roles: Array<{ name: string; status: string }>;
};

type RowParseError = {
  rowIndex: number;
  column?: string;
  value?: string;
  code?: string;
  message: string;
};

type ParseRowsResult = {
  volunteers: ParsedVolunteer[];
  rowErrors: RowParseError[];
};

type ParseRowsInput = {
  rowData: Record<string, string | undefined>;
  rowIndex: number;
};

type ParseRowResult =
  | {
      ok: true;
      parsedVolunteer: ParsedVolunteer;
    }
  | {
      ok: false;
      rowParseErrors: RowParseError[];
    };

type RowDbError = {
  rowIndex: number;
  message: string;
  pg_code?: string;
};

function createEmptyVolunteer(): ParsedVolunteer {
  return {
    index: -1,
    name_org: "",
    pronouns: null,
    email: null,
    phone: null,
    position: null,
    cohort: null,
    roles: [],
    notes: null,
  };
}

function normalizeNullable(value: string | undefined): string | null {
  // field don't exist in the raw papaparse result
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Parses the position field from raw CSV data.
 * The raw CSV can contain role information for "Emergency Back-up" (EBU) and "Crisis Line Counsellor"
 * (CL) roles along with position information (e.g., "staff") in this same field. This function extracts
 * both and populates the parsed volunteer result with the corresponding role and position values.
 *
 * @param position - The raw position/role string from the CSV
 * @param result - The ParsedVolunteer object to update with parsed role and position data
 * @returns true if the position was successfully parsed, false otherwise
 */
function parsePosition(position: string, result: ParsedVolunteer): boolean {
  if (position.includes("EBU")) {
    result.roles.push({ name: "Emergency Back-up", status: "current" });
    result.position = "volunteer";
    return true;
  } else if (position.includes("CL")) {
    result.roles.push({ name: "Crisis Line Counsellor", status: "current" });
    result.position = "volunteer";
    return true;
  } else if (position.toLowerCase().includes("staff")) {
    result.position = "staff";
    return true;
  } else if (position.toLowerCase().includes("training")) {
    result.position = "volunteer";
    return true;
  }

  return false;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(email.trim())) {
    return true;
  }
  return false;
}

function parseCohort(cohort: string, result: ParsedVolunteer): boolean {
  const parts = cohort.trim().split(" ");
  if (parts.length !== 2) {
    return false;
  }

  const yearPart = parts[0];
  const seasonPart = parts[1];
  if (yearPart === undefined || seasonPart === undefined) {
    return false;
  }

  const year = Number(yearPart);

  if (!Number.isInteger(year) || !VALID_COHORT_SEASONS.has(seasonPart)) {
    return false;
  }

  result.cohort = { year, season: seasonPart };
  return true;
}

/**
 * Parses a role field from raw CSV data and adds it to the volunteer's roles array with an appropriate status.
 * Assumes the value is not "no" or null (those should be filtered out by the caller).
 * Attempts to match the raw field value against known status indicators ("interested", "active", "prior")
 * and maps them to valid role status values ("future_interest", "current", "prior").
 * If no matching status is found, the function returns false (parse error).
 *
 * @param value - The raw role status field value from the CSV (must not be "no" or empty)
 * @param roleName - The name of the role (e.g., "Accompaniment", "Chat Counsellor")
 * @param result - The ParsedVolunteer object to update with the parsed role and status
 * @returns true if a valid status was found and the role was added, false if invalid status
 */
function parseRole(
  value: string,
  roleName: string,
  result: ParsedVolunteer
): boolean {
  const trimmed = value.trim().toLowerCase();

  for (const [key, status] of RAW_TO_VALID_ROLE_TYPE) {
    if (trimmed.includes(key)) {
      result.roles.push({ name: roleName, status });
      return true;
    }
  }
  return false;
}

// Process a single row from CSV into a ParsedVolunteer
// fail parse if name/volunteer is blank
function parseRow(
  rowData: Record<string, string | undefined>,
  rowIndex: number
): ParseRowResult {
  // known raw roles and names to map them as

  const result = createEmptyVolunteer();
  const rowParseErrors: RowParseError[] = [];

  result.index = rowIndex;
  result.pronouns = normalizeNullable(rowData[RawCol.PRONOUNS]);
  result.phone = normalizeNullable(rowData[RawCol.PHONE]);
  result.notes = normalizeNullable(rowData[RawCol.NOTES]);

  const volunteerName = normalizeNullable(rowData[RawCol.VOLUNTEER]);
  if (volunteerName) {
    result.name_org = volunteerName;
  } else {
    rowParseErrors.push({
      rowIndex,
      column: RawCol.VOLUNTEER,
      message: "Missing required volunteer name",
    });
  }

  const positionValue = normalizeNullable(rowData[RawCol.POSITION]);
  if (positionValue) {
    const isValidPosition = parsePosition(positionValue, result);
    if (!isValidPosition) {
      rowParseErrors.push({
        rowIndex,
        column: RawCol.POSITION,
        value: positionValue,
        message:
          "Invalid position value. Non-empty values must contain strings 'EBU', 'CL' or 'Staff'",
      });
    }
  }

  const emailValue = normalizeNullable(rowData[RawCol.EMAIL]);
  if (emailValue) {
    const isValidEmail = validateEmail(emailValue);
    if (!isValidEmail) {
      rowParseErrors.push({
        rowIndex,
        column: RawCol.EMAIL,
        value: emailValue,
        message: "Invalid email format.",
      });
    } else {
      result.email = emailValue;
    }
  }

  const cohortValue = normalizeNullable(rowData[RawCol.COHORT]);
  if (cohortValue) {
    const isValidCohort = parseCohort(cohortValue, result);
    if (!isValidCohort) {
      rowParseErrors.push({
        rowIndex,
        column: RawCol.COHORT,
        value: cohortValue,
        message: "Invalid cohort format.",
      });
    }
  }

  Object.entries(RAW_TO_VALID_ROLE_NAME).forEach(
    ([rawRoleColumn, roleName]) => {
      const roleValue = normalizeNullable(rowData[rawRoleColumn]);

      // Skip if empty/null or if field value is "no" (person is not associated with this role)
      if (
        roleValue &&
        typeof rowData[rawRoleColumn] == "string" &&
        !roleValue.trim().toLowerCase().includes("no")
      ) {
        const isValidRole = parseRole(rowData[rawRoleColumn], roleName, result);
        if (!isValidRole) {
          rowParseErrors.push({
            rowIndex,
            column: rawRoleColumn,
            value: roleValue,
            message: "Invalid role status.",
          });
        }
      }
    }
  );

  if (rowParseErrors.length > 0) {
    return {
      ok: false,
      rowParseErrors,
    };
  }

  return {
    ok: true,
    parsedVolunteer: result,
  };
}

// Process all rows from parsed CSV and track row-level parse errors.
function parseRows(rows: ParseRowsInput[]): ParseRowsResult {
  const volunteers: ParsedVolunteer[] = [];
  const rowErrors: RowParseError[] = [];

  rows.forEach(({ rowData, rowIndex }) => {
    const parseResult = parseRow(rowData, rowIndex);

    if (!parseResult.ok) {
      rowErrors.push(...parseResult.rowParseErrors);
      return;
    }

    volunteers.push(parseResult.parsedVolunteer);
  });

  return { volunteers, rowErrors };
}

export async function import_csv(
  csv_string: string
): Promise<ImportCSVResponse> {
  const parsed_csv: ParseResult<Record<string, string | undefined>> =
    Papa.parse<Record<string, string | undefined>>(csv_string, {
      header: true,
    });

  // Collect Papa Parse errors (e.g., malformed CSV rows)
  const papaParseErrors: RowParseError[] = parsed_csv.errors.map((error) => ({
    rowIndex: error.row ?? -1, // row might be undefined for header errors
    code: error.code ?? "csv_format",
    message: error.message ?? "Unknown CSV parse error",
  }));

  // Track rows that Papa Parse marked as malformed and skip row-level parsing for them
  const papaErrorRowIndexes = new Set(
    parsed_csv.errors
      .map((error) => error.row)
      .filter((row): row is number => typeof row === "number" && row >= 0)
  );

  // Pre-process data by lowercasing keys for case-insensitive field matching,
  // and omit papaParse errored data while preserving original row indexes for
  // correct error reporting
  const lowerCasedRows: ParseRowsInput[] = parsed_csv.data
    .map((row: Record<string, string | undefined>, rowIndex: number) => {
      const lowered: Record<string, string | undefined> = {};

      Object.entries(row).forEach(
        ([key, value]: [string, string | undefined]) => {
          lowered[key.toLowerCase()] = value;
        }
      );

      return { rowData: lowered, rowIndex };
    })
    .filter(({ rowIndex }) => !papaErrorRowIndexes.has(rowIndex));

  const { volunteers, rowErrors: rowParseErrors } = parseRows(lowerCasedRows);
  const rowDbErrors: RowDbError[] = [];
  let dbSucceeded = 0;
  let dbFailed = 0;

  const client = await createClient();

  for (const volunteer of volunteers) {
    const { error } = await client.rpc(
      "upsert_volunteer_with_roles_and_cohorts",
      {
        p_name: volunteer.name_org,
        p_pronouns: volunteer.pronouns,
        p_email: volunteer.email,
        p_phone: volunteer.phone,
        p_position: volunteer.position,
        p_cohort: volunteer.cohort,
        p_roles: volunteer.roles,
        p_notes: volunteer.notes,
      }
    );

    if (error) {
      console.error("Failed to upsert volunteer", { volunteer, error });

      dbFailed += 1;
      rowDbErrors.push({
        rowIndex: volunteer.index,
        message: "Database write failed for this row",
        pg_code: error.code,
      });
      continue;
    }

    dbSucceeded += 1;
  }

  const parseFailed = papaParseErrors.length + rowParseErrors.length;
  const hasFailures = parseFailed > 0 || dbFailed > 0;
  const hasSuccesses = dbSucceeded > 0;

  const status: ImportCSVStatus = !hasFailures
    ? "success"
    : hasSuccesses
      ? "partial_success"
      : "failed";

  return {
    status,
    summary: {
      totalRows: parsed_csv.data.length,
      parsedSucceeded: volunteers.length,
      parseFailed,
      dbSucceeded,
      dbFailed,
    },
    parseErrors: [...papaParseErrors, ...rowParseErrors],
    dbErrors: rowDbErrors,
  };
}

export const __testables = {
  createEmptyVolunteer,
  normalizeNullable,
  parsePosition,
  validateEmail,
  parseCohort,
  parseRole,
  parseRow,
  parseRows,
};
