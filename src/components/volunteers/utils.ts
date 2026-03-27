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

export const getTagColorClass = (label: string): string => {
  const text = label.toLowerCase();

  if (text === "yes") return "bg-tag-green";
  if (text === "no") return "bg-tag-red";
  if (text.includes("fall")) return "bg-tag-yellow";
  if (text.includes("summer")) return "bg-tag-green";
  if (text.includes("spring")) return "bg-tag-blue";
  if (text.includes("winter")) return "bg-tag-pink";
  if (text === "she/her") return "bg-tag-pink";
  if (text === "he/him") return "bg-tag-purple";
  if (text === "they/them") return "bg-tag-yellow";
  if (text === "member") return "bg-tag-brown";
  if (text === "volunteer") return "bg-tag-purple";
  if (text === "staff") return "bg-tag-pink";
  if (text === "crisis line counsellor") return "bg-tag-orange";
  if (text === "chat counsellor") return "bg-tag-yellow";
  if (text === "emergency back-up") return "bg-tag-red";

  return "bg-tag-gray";
};
