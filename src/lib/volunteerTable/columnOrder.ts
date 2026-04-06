import type { CustomColumnRow } from "@/lib/api/customColumns";

/** Must match the order of entries in `COLUMNS_CONFIG` (volunteerColumns.tsx). */
export const BUILT_IN_VOLUNTEER_COLUMN_IDS: readonly string[] = [
  "volunteer_id",
  "name_org",
  "pseudonym",
  "pronouns",
  "email",
  "phone",
  "cohorts",
  "prior_roles",
  "current_roles",
  "future_interests",
  "opt_in_communication",
  "notes",
];

export const CUSTOM_COLUMN_ID_PREFIX = "custom__";

export function tableIdForCustomColumn(columnKey: string): string {
  return `${CUSTOM_COLUMN_ID_PREFIX}${columnKey}`;
}

export function parseCustomColumnTableId(columnId: string): string | null {
  if (!columnId.startsWith(CUSTOM_COLUMN_ID_PREFIX)) return null;
  return columnId.slice(CUSTOM_COLUMN_ID_PREFIX.length);
}

export function orderedColumnIds(
  builtInIds: string[],
  customColumns: CustomColumnRow[],
  savedOrder: string[],
  /** When set, custom columns with created_at at or before this time are not auto-appended if missing from savedOrder (e.g. removed from prefs but not yet deleted in DB). */
  prefsUpdatedAt?: string | null
): string[] {
  const customSorted = [...customColumns].sort(
    (a, b) => a.default_position - b.default_position || a.id - b.id
  );
  const customIds = customSorted.map((c) =>
    tableIdForCustomColumn(c.column_key)
  );
  const allKnown = [...builtInIds, ...customIds];

  if (savedOrder.length === 0) {
    return allKnown;
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of savedOrder) {
    if (!allKnown.includes(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of builtInIds) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  const prefsTime = prefsUpdatedAt ? Date.parse(prefsUpdatedAt) : NaN;
  for (const c of customSorted) {
    const id = tableIdForCustomColumn(c.column_key);
    if (seen.has(id)) continue;
    const created =
      c.created_at != null && c.created_at !== ""
        ? Date.parse(c.created_at)
        : NaN;
    const appendNewCustom =
      !Number.isFinite(prefsTime) ||
      !Number.isFinite(created) ||
      created > prefsTime;
    if (appendNewCustom) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
