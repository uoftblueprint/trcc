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
  if (text.includes("member")) return "bg-tag-brown";
  if (text.includes("crisis")) return "bg-tag-orange";
  if (text.includes("chat")) return "bg-tag-yellow";
  if (text.includes("emergency")) return "bg-tag-red";

  return "bg-tag-gray";
};
