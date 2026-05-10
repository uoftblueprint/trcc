/**
 * DB role `type` values map to volunteer table columns (user-facing names).
 */

export type RoleTagDbType =
  | "prior"
  | "current"
  | "future_interest"
  | "training";

export const ROLE_TAG_COLUMN_LABEL: Record<RoleTagDbType, string> = {
  training: "Training",
  prior: "Position",
  current: "Committee",
  future_interest: "Language",
};

export function roleTagColumnLabel(type: string): string {
  if (
    type === "training" ||
    type === "prior" ||
    type === "current" ||
    type === "future_interest"
  ) {
    return ROLE_TAG_COLUMN_LABEL[type];
  }
  return type;
}
