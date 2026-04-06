export const PRONOUN_OPTIONS = ["She/Her", "He/Him", "They/Them", "Other"];
export const OPT_IN_OPTIONS = ["Yes", "No"];

export const TERM_ORDER: Record<string, number> = {
  winter: 1,
  spring: 2,
  summer: 3,
  fall: 4,
};

export const sortCohorts = (a: string, b: string): number => {
  const [termA, yearA] = a.split(" ");
  const [termB, yearB] = b.split(" ");
  if (yearA !== yearB) return Number(yearA || 0) - Number(yearB || 0);

  return (
    (TERM_ORDER[termA?.toLowerCase() || ""] || 0) -
    (TERM_ORDER[termB?.toLowerCase() || ""] || 0)
  );
};

export const sortRoles = (a: string, b: string): number => a.localeCompare(b);

export const formatCellData = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

/** Theme tokens from `src/styles/variables.css` @theme — use inline so colors always apply (avoids purged Tailwind classes). */
const TAG_BG_VARS = [
  "var(--color-tag-blue)",
  "var(--color-tag-green)",
  "var(--color-tag-yellow)",
  "var(--color-tag-pink)",
  "var(--color-tag-purple)",
  "var(--color-tag-orange)",
  "var(--color-tag-brown)",
  "var(--color-tag-red)",
] as const;

const EXPLICIT_TAG_BG: Record<string, string> = {
  yes: "var(--color-tag-green)",
  no: "var(--color-tag-red)",
  "she/her": "var(--color-tag-pink)",
  "he/him": "var(--color-tag-purple)",
  "they/them": "var(--color-tag-yellow)",
  "emergency back-up": "var(--color-tag-red)",
};

const KEYWORD_TAG_BG: [string, string][] = [
  ["fall", "var(--color-tag-yellow)"],
  ["summer", "var(--color-tag-green)"],
  ["spring", "var(--color-tag-blue)"],
  ["winter", "var(--color-tag-pink)"],
];

const assignedTagBackground = new Map<string, string>();

function stableColorIndexForLabel(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Returns a CSS `background-color` value (theme variable) for tag labels. */
export function getTagBackgroundColor(label: string): string {
  const text = label.toLowerCase();

  const explicit = EXPLICIT_TAG_BG[text];
  if (explicit) return explicit;

  for (const [keyword, bg] of KEYWORD_TAG_BG) {
    if (text.includes(keyword)) return bg;
  }

  const cached = assignedTagBackground.get(text);
  if (cached) return cached;

  const idx = stableColorIndexForLabel(text) % TAG_BG_VARS.length;
  const bg = TAG_BG_VARS[idx] ?? "var(--color-tag-gray)";
  assignedTagBackground.set(text, bg);
  return bg;
}
