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
  return String(value);
};

const TAG_COLORS = [
  "bg-tag-blue",
  "bg-tag-green",
  "bg-tag-yellow",
  "bg-tag-pink",
  "bg-tag-purple",
  "bg-tag-orange",
  "bg-tag-brown",
  "bg-tag-red",
  "bg-tag-gray",
] as const;

const EXPLICIT_TAG_COLORS: Record<string, string> = {
  yes: "bg-tag-green",
  no: "bg-tag-red",
  "she/her": "bg-tag-pink",
  "he/him": "bg-tag-purple",
  "they/them": "bg-tag-yellow",
  "emergency back-up": "bg-tag-red",
};

const KEYWORD_TAG_COLORS: [string, string][] = [
  ["fall", "bg-tag-yellow"],
  ["summer", "bg-tag-green"],
  ["spring", "bg-tag-blue"],
  ["winter", "bg-tag-pink"],
];

const hashString = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getTagColorClass = (label: string): string => {
  const text = label.toLowerCase();

  const explicit = EXPLICIT_TAG_COLORS[text];
  if (explicit) return explicit;

  for (const [keyword, color] of KEYWORD_TAG_COLORS) {
    if (text.includes(keyword)) return color;
  }

  return TAG_COLORS[hashString(text) % TAG_COLORS.length] ?? "bg-tag-gray";
};
