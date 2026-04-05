/**
 * Plain-language copy and formatting for the volunteer CSV import UI.
 * Technical column keys come from import_csv.ts (matched case-insensitively in the file).
 */

export const CSV_IMPORT_REQUIRED_COLUMNS = [
  {
    header: "volunteer",
    label: "Volunteer",
    description: "The person's name (required on every data row).",
  },
  {
    header: "email",
    label: "Email",
    description:
      "A valid email address (can be left empty on a row if you have no email).",
  },
] as const;

export const CSV_IMPORT_OPTIONAL_COLUMNS = [
  { header: "pronouns", label: "Pronouns" },
  { header: "phone", label: "Phone" },
  {
    header: "cohort",
    label: "Cohort",
    note: "Optional. If filled, use a year, a space, then Fall, Winter, Spring, or Summer — e.g. 2024 Fall.",
  },
  {
    header: "position",
    label: "Position",
    note: "Optional. CL / EBU / Staff / Training are recognized for special roles; other titles (e.g. Volunteer, Coordinator) are saved as volunteer or member when the word “member” appears.",
  },
  {
    header: "notes",
    label: "Notes",
    note: "Use this column name (any capitals are fine). It matches the old membership spreadsheet.",
  },
  {
    header: "accompaniment",
    label: "Role columns (one column each)",
    note: "Also: chat, f2f, front desk, grants, training team, board member. Leave blank or write “no”, or use text that includes interested, active, or prior.",
  },
] as const;

/** Steps for exporting from Google Sheets (user-facing). */
export const CSV_IMPORT_GOOGLE_SHEETS_STEPS = [
  "Put your column titles in the first row (see the required columns below).",
  "Fill in one person per row.",
  "In Google Sheets, use File → Download → Comma Separated Values (.csv).",
  "In this app, open Import from CSV, choose that downloaded file, then click Import.",
] as const;

/**
 * Common import issues and fixes for non-technical users (shown in the import modal).
 */
export const CSV_IMPORT_TROUBLESHOOTING: ReadonlyArray<{
  problem: string;
  fixes: readonly string[];
}> = [
  {
    problem: "Missing column titles or “required header” error",
    fixes: [
      "Row 1 of your file must include the words volunteer and email as column titles (capital letters are fine).",
      "If you used Excel, use Save As → CSV. Do not rename the file to .csv if it is still an Excel workbook.",
    ],
  },
  {
    problem: "Missing volunteer name or “missing name” on a row",
    fixes: [
      "Every person needs a name in the volunteer column. Fill in the blank cell.",
      "Delete extra blank rows at the bottom of your sheet before you download the CSV.",
    ],
  },
  {
    problem: "Invalid email",
    fixes: [
      "If the email cell has text, it must look like name@example.com (with an @ and a domain).",
      "You may leave the email cell empty if you do not have an address for that person.",
      "If you see a blue notice: that person was still imported — fix the cell and use Import again if you want the email stored.",
    ],
  },
  {
    problem: "Invalid cohort or “cohort not applied” (yellow/blue notice)",
    fixes: [
      "Use a four-digit year, a space, then Fall, Winter, Spring, or Summer — for example: 2024 Fall.",
      "Avoid formats like 2026Winter or Winter2021; there must be a space between year and season.",
      "The person is still saved; fix the cohort cell and use Import again if you want the cohort attached.",
    ],
  },
  {
    problem: "Invalid role column (accompaniment, chat, f2f, etc.)",
    fixes: [
      "Leave the cell empty or write no if that role does not apply.",
      "Otherwise use words that include interested, active, or prior (for example: 1. Active).",
      "If you see a blue notice: that person was still imported without that role — fix the cell and Import again to attach it.",
    ],
  },
  {
    problem: "The same person appears several times after import",
    fixes: [
      "Rows that share the same name and the same email (including when both have no email) are merged into one volunteer. If you still see old duplicates, delete the extras in the table or remove duplicate lines in the sheet before importing again.",
    ],
  },
  {
    problem: "Wrong number of columns / garbled row",
    fixes: [
      "Usually a comma inside one cell broke the row. In Google Sheets, avoid commas in cells or wrap the text so the file still lines up with the header row.",
      "Make sure every data row has the same number of columns as row 1.",
    ],
  },
  {
    problem: "Could not save to the database",
    fixes: [
      "The row looked fine but the server rejected it. Try Import again in a moment.",
      "If it keeps happening, contact an administrator.",
    ],
  },
  {
    problem: "File will not select or “choose a .csv file”",
    fixes: [
      "Export from Google Sheets or Excel as Comma Separated Values (.csv), not .xlsx.",
    ],
  },
];

const COLUMN_KEY_TO_LABEL: Record<string, string> = {
  volunteer: "Volunteer (name)",
  email: "Email",
  position: "Position",
  cohort: "Cohort",
  pronouns: "Pronouns",
  phone: "Phone",
  "notes (copied from prior traning sheet)": "Notes",
  accompaniment: "Accompaniment (role)",
  chat: "Chat (role)",
  f2f: "F2F (role)",
  "front desk": "Front desk (role)",
  grants: "Grants (role)",
  "training team": "Training team (role)",
  "board member": "Board member (role)",
};

function columnLabel(column: string | undefined): string | undefined {
  if (!column) return undefined;
  const lower = column.toLowerCase();
  return COLUMN_KEY_TO_LABEL[lower] ?? column;
}

/** 1-based spreadsheet row: row 1 = headers, first data row = 2. */
function csvDataIndexToSpreadsheetRow(rowIndex: number): number | null {
  if (rowIndex < 0) return null;
  return rowIndex + 2;
}

export type CsvImportErrorDisplay = {
  location: string;
  summary: string;
  hint: string | null;
  rawValue?: string;
};

function hintForParseError(
  message: string,
  columnKey: string | undefined
): string | null {
  if (message.includes("Missing required volunteer name")) {
    return "Add the person's name in the Volunteer column for this row.";
  }
  if (message.includes("Invalid email")) {
    return "Use a normal email shape, like name@example.com.";
  }
  if (message.includes("Invalid cohort")) {
    return "Use a year, a space, then Fall, Winter, Spring, or Summer — for example: 2024 Fall.";
  }
  if (
    message.includes("Invalid position") ||
    message.includes("position value")
  ) {
    return "Include CL, EBU, Staff, or Training in this cell (capitalization does not matter).";
  }
  if (message.includes("Invalid role status")) {
    const role = columnLabel(columnKey);
    return `In ${role ?? "this role column"}, use text that includes interested, active, or prior — or leave it empty / use “no” if they do not have that role.`;
  }
  if (message.includes("missing required header")) {
    return "Add a header row with the exact column names listed under “Required columns” in the help section above (spelling can use capitals or lowercase).";
  }
  if (
    message.includes("Too few fields") ||
    message.includes("Too many fields")
  ) {
    return "This row has a different number of columns than the header row. In Google Sheets, check for extra commas inside a cell or a missing comma between cells.";
  }
  return null;
}

function hintForDbError(): string {
  return "This row was read correctly but could not be saved. If it keeps happening, try again later or contact an administrator.";
}

function friendlyMissingHeadersMessage(message: string): string {
  const prefix = "CSV is missing required header(s):";
  if (!message.includes(prefix)) return message;
  const rest = message.slice(message.indexOf(prefix) + prefix.length).trim();
  const keys = rest
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (keys.length === 0) return message;
  const labels = keys.map((k) => COLUMN_KEY_TO_LABEL[k.toLowerCase()] ?? k);
  return `The first row of your file must include these column titles: ${labels.join(", ")}.`;
}

export function formatCsvImportErrorForDisplay(
  err: {
    rowIndex: number;
    column?: string;
    value?: string;
    message: string;
  },
  kind: "parse" | "db"
): CsvImportErrorDisplay {
  const spreadsheetRow = csvDataIndexToSpreadsheetRow(err.rowIndex);
  const col = columnLabel(err.column);

  let location: string;
  if (err.rowIndex < 0) {
    location = "Column headers (row 1)";
  } else if (spreadsheetRow !== null) {
    location =
      col !== undefined
        ? `Spreadsheet row ${spreadsheetRow} · ${col}`
        : `Spreadsheet row ${spreadsheetRow}`;
  } else {
    location = col !== undefined ? col : "File";
  }

  let summary =
    kind === "parse" && err.rowIndex < 0
      ? friendlyMissingHeadersMessage(err.message)
      : err.message;
  if (kind === "db" && err.message === "Database write failed for this row") {
    summary = "Could not save this volunteer to the database.";
  }

  const hint =
    kind === "db"
      ? hintForDbError()
      : hintForParseError(err.message, err.column);

  const out: CsvImportErrorDisplay = {
    location,
    summary,
    hint,
  };
  if (err.value !== undefined && err.value !== "") {
    out.rawValue = err.value;
  }
  return out;
}

const ROLE_COLUMN_KEYS = new Set([
  "accompaniment",
  "chat",
  "f2f",
  "front desk",
  "grants",
  "training team",
  "board member",
]);

/** Warnings: row imported but a field (cohort, email, role, etc.) was skipped. */
export function formatCsvImportWarningForDisplay(w: {
  rowIndex: number;
  column?: string;
  value?: string;
  message: string;
}): CsvImportErrorDisplay {
  const errInput: {
    rowIndex: number;
    message: string;
    column?: string;
    value?: string;
  } = { rowIndex: w.rowIndex, message: w.message };
  if (w.column !== undefined) {
    errInput.column = w.column;
  }
  if (w.value !== undefined) {
    errInput.value = w.value;
  }
  const d = formatCsvImportErrorForDisplay(errInput, "parse");
  const col = w.column?.toLowerCase() ?? "";
  let hint: string | null = null;
  if (col === "cohort") {
    hint =
      "Use a year, a space, then Fall, Winter, Spring, or Summer — for example: 2024 Fall. You can fix the sheet and use Import again to attach a cohort.";
  } else if (col === "email") {
    hint =
      "Use a normal email like name@example.com, or leave the cell empty. You can add the email later in the table or re-import after fixing the sheet.";
  } else if (ROLE_COLUMN_KEYS.has(col)) {
    hint =
      "Use text that includes interested, active, or prior — or leave the cell empty or write “no”. Re-import after fixing to attach this role.";
  }
  return {
    ...d,
    summary: w.message,
    hint: hint ?? d.hint,
  };
}
