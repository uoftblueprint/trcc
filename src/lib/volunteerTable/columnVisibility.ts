/** Built-in columns that must always remain visible (personal prefs, org prefs, and UI). */
export const NON_HIDEABLE_COLUMN_IDS: readonly string[] = [
  "volunteer_id",
  "opt_in_communication",
];

export function sanitizeHiddenColumnIds(ids: string[]): string[] {
  const banned = new Set(NON_HIDEABLE_COLUMN_IDS);
  return ids.filter((id) => !banned.has(id));
}
