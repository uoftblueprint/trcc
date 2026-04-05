import { describe, expect, it } from "vitest";
import {
  buildPhoneFormatBulkEdits,
  collectVisibleEmailsCommaSeparated,
  collectVisiblePhonesCommaSeparated,
  findVolunteerDuplicateClusters,
  formatPhoneIfNanp,
  normalizeEmailDedupe,
  normalizePhoneDedupe,
  parseBatchVolunteerLines,
  volunteerLabelById,
} from "@/components/volunteers/volunteersShortcutsUtils";
import type { Volunteer } from "@/components/volunteers/types";

function vol(overrides: Partial<Volunteer> & { id: number }): Volunteer {
  const { id, ...rest } = overrides;
  return {
    id,
    name_org: "Test",
    email: null,
    phone: null,
    pronouns: null,
    pseudonym: null,
    opt_in_communication: false,
    notes: null,
    position: null,
    created_at: "",
    updated_at: "",
    cohorts: [],
    prior_roles: [],
    current_roles: [],
    future_interests: [],
    ...rest,
  };
}

describe("formatPhoneIfNanp", () => {
  it("formats 10 digits", () => {
    expect(formatPhoneIfNanp("4165550100")).toBe("(416) 555-0100");
    expect(formatPhoneIfNanp("(416) 555-0100")).toBe("(416) 555-0100");
  });

  it("formats 11 digits with leading 1", () => {
    expect(formatPhoneIfNanp("14165550100")).toBe("(416) 555-0100");
  });

  it("returns null for non-NANP lengths", () => {
    expect(formatPhoneIfNanp("+44 20 7946 0958")).toBeNull();
    expect(formatPhoneIfNanp("12345")).toBeNull();
    expect(formatPhoneIfNanp("")).toBeNull();
    expect(formatPhoneIfNanp(null)).toBeNull();
  });
});

describe("buildPhoneFormatBulkEdits", () => {
  it("skips rows that need no change", () => {
    const edits = buildPhoneFormatBulkEdits([
      vol({ id: 1, phone: "(416) 555-0100" }),
      vol({ id: 2, phone: "4165550101" }),
    ]);
    expect(edits).toEqual([
      { rowId: 2, colId: "phone", value: "(416) 555-0101" },
    ]);
  });
});

describe("collectVisibleEmailsCommaSeparated", () => {
  it("joins non-empty emails", () => {
    expect(
      collectVisibleEmailsCommaSeparated([
        vol({ id: 1, email: "a@x.com" }),
        vol({ id: 2, email: null }),
        vol({ id: 3, email: "b@y.org" }),
      ])
    ).toBe("a@x.com, b@y.org");
  });
});

describe("collectVisiblePhonesCommaSeparated", () => {
  it("joins non-empty phones", () => {
    expect(
      collectVisiblePhonesCommaSeparated([
        vol({ id: 1, phone: "416-555-0100" }),
        vol({ id: 2, phone: null }),
        vol({ id: 3, phone: "647-555-0101" }),
      ])
    ).toBe("416-555-0100, 647-555-0101");
  });
});

describe("findVolunteerDuplicateClusters", () => {
  it("groups duplicate emails and phones", () => {
    const clusters = findVolunteerDuplicateClusters([
      vol({ id: 1, email: "A@X.COM", phone: "4165550100" }),
      vol({ id: 2, email: "a@x.com", phone: "416-555-0100" }),
      vol({ id: 3, email: "b@y.com", phone: null }),
    ]);
    const emailDup = clusters.find((c) => c.kind === "email");
    const phoneDup = clusters.find((c) => c.kind === "phone");
    expect(emailDup?.volunteerIds).toEqual([1, 2]);
    expect(phoneDup?.volunteerIds).toEqual([1, 2]);
  });
});

describe("normalizeEmailDedupe / normalizePhoneDedupe", () => {
  it("normalizes email case and phone digits", () => {
    expect(normalizeEmailDedupe("  A@B.C  ")).toBe("a@b.c");
    expect(normalizeEmailDedupe("  ")).toBeNull();
    expect(normalizePhoneDedupe("(416) 555-0100")).toBe("4165550100");
    expect(normalizePhoneDedupe("12345")).toBeNull();
  });
});

describe("volunteerLabelById", () => {
  it("falls back to id", () => {
    expect(volunteerLabelById([vol({ id: 5, name_org: "Pat" })], 5)).toBe(
      "Pat"
    );
    expect(volunteerLabelById([], 99)).toBe("#99");
  });
});

describe("parseBatchVolunteerLines", () => {
  it("parses comma-separated lines like user examples", () => {
    const input = [
      "josh, josh@mail.com, 4372899292",
      "another user, another@mail.com",
      "another another",
      "another one, mail.mail@mail.com",
    ].join("\n");
    expect(parseBatchVolunteerLines(input)).toEqual([
      {
        name_org: "josh",
        email: "josh@mail.com",
        phone: "4372899292",
      },
      {
        name_org: "another user",
        email: "another@mail.com",
        phone: null,
      },
      { name_org: "another another", email: null, phone: null },
      {
        name_org: "another one",
        email: "mail.mail@mail.com",
        phone: null,
      },
    ]);
  });

  it("parses tab-separated lines and skips comments", () => {
    expect(
      parseBatchVolunteerLines("Alice\ta@b.c\t5551234567\n# skip\nBob\n")
    ).toEqual([
      {
        name_org: "Alice",
        email: "a@b.c",
        phone: "5551234567",
      },
      { name_org: "Bob", email: null, phone: null },
    ]);
  });

  it("treats two columns without @ as name and phone", () => {
    expect(parseBatchVolunteerLines("Jane, 4165550100")).toEqual([
      { name_org: "Jane", email: null, phone: "4165550100" },
    ]);
  });
});
