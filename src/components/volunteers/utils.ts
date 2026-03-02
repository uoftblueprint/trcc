export const formatCellData = (value: unknown): string => {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
};

export const getTagColorClass = (label: string): string => {
  const text = label.toLowerCase();

  if (text.includes("fall")) return "bg-tag-yellow";
  if (text.includes("summer")) return "bg-tag-green";
  if (text.includes("spring")) return "bg-tag-blue";
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
