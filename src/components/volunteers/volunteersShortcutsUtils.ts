import type { Volunteer } from "./types";

/**
 * If the value is a 10-digit NANP number or 11 digits starting with 1,
 * returns display string "(XXX) XXX-XXXX". Otherwise returns null (leave unchanged).
 */
export function formatPhoneIfNanp(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return null;
}

export function buildPhoneFormatBulkEdits(
  volunteers: Volunteer[]
): Array<{ rowId: number; colId: string; value: unknown }> {
  const edits: Array<{ rowId: number; colId: string; value: unknown }> = [];
  for (const v of volunteers) {
    const formatted = formatPhoneIfNanp(v.phone);
    if (formatted === null) continue;
    const current = v.phone != null ? String(v.phone).trim() : "";
    if (formatted === current) continue;
    edits.push({ rowId: v.id, colId: "phone", value: formatted });
  }
  return edits;
}

export type ParsedBatchVolunteerLine = {
  name_org: string;
  email: string | null;
  phone: string | null;
};

function fieldLooksLikeEmail(s: string): boolean {
  return s.includes("@");
}

function parseBatchLine(trimmed: string): ParsedBatchVolunteerLine | null {
  let parts: string[];
  if (trimmed.includes("\t")) {
    parts = trimmed
      .split("\t")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  } else {
    parts = trimmed
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  if (parts.length === 0) return null;

  const name_org = parts[0] ?? "";
  if (!name_org) return null;

  if (parts.length === 1) {
    return { name_org, email: null, phone: null };
  }

  if (parts.length === 2) {
    const second = parts[1] ?? "";
    if (fieldLooksLikeEmail(second)) {
      return { name_org, email: second, phone: null };
    }
    return { name_org, email: null, phone: second || null };
  }

  const email = parts[1] ?? "";
  const phone = parts.slice(2).join(", ").trim() || null;
  return {
    name_org,
    email: email || null,
    phone,
  };
}

/**
 * One volunteer per non-empty line. Lines starting with # are skipped.
 *
 * Comma-separated (default): `name`, `name, email`, or `name, email, phone`.
 * If a line contains a tab, columns are split on tabs instead (same three fields).
 * Avoid commas inside the name; they are treated as column separators.
 */
export function parseBatchVolunteerLines(
  text: string
): ParsedBatchVolunteerLine[] {
  const lines = text.split(/\r?\n/);
  const rows: ParsedBatchVolunteerLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const row = parseBatchLine(trimmed);
    if (row) rows.push(row);
  }

  return rows;
}

export function collectVisibleEmailsCommaSeparated(
  volunteers: Volunteer[]
): string {
  const emails = volunteers
    .map((v) => v.email?.trim())
    .filter((e): e is string => Boolean(e));
  return emails.join(", ");
}

export function collectVisiblePhonesCommaSeparated(
  volunteers: Volunteer[]
): string {
  const phones = volunteers
    .map((v) => v.phone?.trim())
    .filter((p): p is string => Boolean(p));
  return phones.join(", ");
}

export function normalizeEmailDedupe(
  email: string | null | undefined
): string | null {
  const t = email?.trim().toLowerCase();
  return t ? t : null;
}

/** Digits only; used for duplicate detection. Requires at least 7 digits. */
export function normalizePhoneDedupe(
  phone: string | null | undefined
): string | null {
  if (phone == null) return null;
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

export type DuplicateCluster = {
  kind: "email" | "phone";
  key: string;
  volunteerIds: number[];
};

export function findVolunteerDuplicateClusters(
  volunteers: Volunteer[]
): DuplicateCluster[] {
  const byEmail = new Map<string, number[]>();
  const byPhone = new Map<string, number[]>();

  for (const v of volunteers) {
    const e = normalizeEmailDedupe(v.email);
    if (e) {
      const list = byEmail.get(e) ?? [];
      list.push(v.id);
      byEmail.set(e, list);
    }
    const p = normalizePhoneDedupe(v.phone);
    if (p) {
      const list = byPhone.get(p) ?? [];
      list.push(v.id);
      byPhone.set(p, list);
    }
  }

  const out: DuplicateCluster[] = [];
  for (const [key, ids] of byEmail) {
    if (ids.length > 1) {
      out.push({
        kind: "email",
        key,
        volunteerIds: [...new Set(ids)].sort((a, b) => a - b),
      });
    }
  }
  for (const [key, ids] of byPhone) {
    if (ids.length > 1) {
      out.push({
        kind: "phone",
        key,
        volunteerIds: [...new Set(ids)].sort((a, b) => a - b),
      });
    }
  }

  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "email" ? -1 : 1;
    return a.key.localeCompare(b.key);
  });
  return out;
}

export function volunteerLabelById(
  volunteers: Volunteer[],
  id: number
): string {
  const v = volunteers.find((x) => x.id === id);
  return v?.name_org?.trim() || `#${id}`;
}
