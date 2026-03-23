import { describe, it, expect } from "vitest";
import { __testables } from "@/lib/api/import_csv";

const {
  createEmptyVolunteer,
  normalizeNullable,
  parsePosition,
  validateEmail,
  parseCohort,
  parseRole,
  parseRow,
  parseRows,
  validateHeaders,
} = __testables;

describe("import_csv helper functions", () => {
  describe("normalizeNullable", () => {
    it("returns null for undefined", () => {
      expect(normalizeNullable(undefined)).toBeNull();
    });

    it("returns null for empty/whitespace strings", () => {
      expect(normalizeNullable("")).toBeNull();
      expect(normalizeNullable("   ")).toBeNull();
    });

    it("returns trimmed value for non-empty strings", () => {
      expect(normalizeNullable("  hello  ")).toBe("hello");
    });
  });

  describe("parsePosition", () => {
    it("parses EBU and sets volunteer position with current role", () => {
      const result = createEmptyVolunteer();
      const ok = parsePosition("EBU", result);

      expect(ok).toBe(true);
      expect(result.position).toBe("volunteer");
      expect(result.roles).toEqual([
        { name: "Emergency Back-up", status: "current" },
      ]);
    });

    it("parses CL and sets volunteer position with current role", () => {
      const result = createEmptyVolunteer();
      const ok = parsePosition("CL", result);

      expect(ok).toBe(true);
      expect(result.position).toBe("volunteer");
      expect(result.roles).toEqual([
        { name: "Crisis Line Counsellor", status: "current" },
      ]);
    });

    it("parses staff case-insensitively", () => {
      const result = createEmptyVolunteer();
      const ok = parsePosition("StaFf", result);

      expect(ok).toBe(true);
      expect(result.position).toBe("staff");
      expect(result.roles).toEqual([]);
    });

    it("returns false for unsupported non-empty position", () => {
      const result = createEmptyVolunteer();
      const ok = parsePosition("Volunteer", result);

      expect(ok).toBe(false);
      expect(result.position).toBeNull();
      expect(result.roles).toEqual([]);
    });
  });

  describe("validateEmail", () => {
    it("accepts valid email and stores trimmed value", () => {
      const ok = validateEmail("  test@example.com  ");

      expect(ok).toBe(true);
    });

    it("rejects invalid email", () => {
      const ok = validateEmail("not-an-email");

      expect(ok).toBe(false);
    });
  });

  describe("parseCohort", () => {
    it("accepts valid cohort and fills year/season", () => {
      const result = createEmptyVolunteer();
      const ok = parseCohort("2025 Fall", result);

      expect(ok).toBe(true);
      expect(result.cohort).toEqual({ year: 2025, season: "Fall" });
    });

    it("rejects invalid format", () => {
      const result = createEmptyVolunteer();
      const ok = parseCohort("Fall 2025", result);

      expect(ok).toBe(false);
      expect(result.cohort).toBeNull();
    });

    it("rejects invalid season", () => {
      const result = createEmptyVolunteer();
      const ok = parseCohort("2025 Monsoon", result);

      expect(ok).toBe(false);
      expect(result.cohort).toBeNull();
    });
  });

  describe("parseRole", () => {
    it("maps interested to future_interest", () => {
      const result = createEmptyVolunteer();
      const ok = parseRole("interested", "Accompaniment", result);

      expect(ok).toBe(true);
      expect(result.roles).toEqual([
        { name: "Accompaniment", status: "future_interest" },
      ]);
    });

    it("maps active to current", () => {
      const result = createEmptyVolunteer();
      const ok = parseRole("active", "Chat Counsellor", result);

      expect(ok).toBe(true);
      expect(result.roles).toEqual([
        { name: "Chat Counsellor", status: "current" },
      ]);
    });

    it("maps prior to prior", () => {
      const result = createEmptyVolunteer();
      const ok = parseRole("prior", "Front Desk", result);

      expect(ok).toBe(true);
      expect(result.roles).toEqual([{ name: "Front Desk", status: "prior" }]);
    });

    it("returns false for unknown role status", () => {
      const result = createEmptyVolunteer();
      const ok = parseRole("maybe", "Front Desk", result);

      expect(ok).toBe(false);
      expect(result.roles).toEqual([]);
    });
  });

  describe("parseRow", () => {
    it("returns parsed volunteer for valid row and skips role columns with no", () => {
      const rowData: Record<string, string | undefined> = {
        volunteer: "Jane Doe",
        pronouns: "she/her",
        phone: "123-456-7890",
        "notes (copied from prior traning sheet)": "Note",
        email: "jane@example.com",
        position: "Staff",
        cohort: "2024 Winter",
        accompaniment: "active",
        chat: "no",
        f2f: "prior",
      };

      const parsed = parseRow(rowData, 7);

      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.parsedVolunteer.index).toBe(7);
        expect(parsed.parsedVolunteer.name_org).toBe("Jane Doe");
        expect(parsed.parsedVolunteer.position).toBe("staff");
        expect(parsed.parsedVolunteer.email).toBe("jane@example.com");
        expect(parsed.parsedVolunteer.cohort).toEqual({
          year: 2024,
          season: "Winter",
        });
        expect(parsed.parsedVolunteer.roles).toEqual([
          { name: "Accompaniment", status: "current" },
          { name: "F2F", status: "prior" },
        ]);
      }
    });

    it("returns multiple parse errors for same row index", () => {
      const rowData: Record<string, string | undefined> = {
        volunteer: "",
        email: "bad-email",
        position: "invalid",
        cohort: "2025 ???",
        accompaniment: "maybe",
      };

      const parsed = parseRow(rowData, 3);

      expect(parsed.ok).toBe(false);
      if (!parsed.ok) {
        expect(parsed.rowParseErrors.length).toBeGreaterThanOrEqual(4);
        expect(parsed.rowParseErrors.every((e) => e.rowIndex === 3)).toBe(true);
        expect(parsed.rowParseErrors.map((e) => e.column)).toEqual(
          expect.arrayContaining([
            "volunteer",
            "position",
            "email",
            "cohort",
            "accompaniment",
          ])
        );
      }
    });
  });

  describe("parseRows", () => {
    it("collects successful rows and failed row errors while preserving original row indices", () => {
      const rows = [
        {
          rowIndex: 0,
          rowData: {
            volunteer: "Valid Person",
            email: "valid@example.com",
            position: "CL",
            cohort: "2026 Fall",
          },
        },
        {
          rowIndex: 5,
          rowData: {
            volunteer: "",
            email: "invalid",
            position: "bad",
          },
        },
      ];

      const out = parseRows(rows);

      expect(out.volunteers).toHaveLength(1);
      expect(out.volunteers[0]?.index).toBe(0);
      expect(out.rowErrors.length).toBeGreaterThan(0);
      expect(out.rowErrors.every((e) => e.rowIndex === 5)).toBe(true);
    });
  });

  describe("validateHeaders", () => {
    it("returns empty array when all required headers are present", () => {
      const headers = [
        "VOLUNTEER",
        "PRONOUNS",
        "POSITION",
        "COHORT",
        "EMAIL",
        "PHONE",
      ];
      expect(validateHeaders(headers)).toEqual([]);
    });

    it("returns empty array with case-insensitive matching", () => {
      const headers = ["Volunteer", "Email", "Position", "Cohort"];
      expect(validateHeaders(headers)).toEqual([]);
    });

    it("returns missing headers when required ones are absent", () => {
      const headers = ["PRONOUNS", "PHONE"];
      const missing = validateHeaders(headers);
      expect(missing).toEqual(
        expect.arrayContaining(["volunteer", "email", "position", "cohort"])
      );
    });

    it("returns only the specific missing headers", () => {
      const headers = ["VOLUNTEER", "COHORT"];
      const missing = validateHeaders(headers);
      expect(missing).toContain("email");
      expect(missing).toContain("position");
      expect(missing).not.toContain("volunteer");
      expect(missing).not.toContain("cohort");
    });

    it("returns all required headers for empty input", () => {
      expect(validateHeaders([])).toHaveLength(4);
    });
  });
});
