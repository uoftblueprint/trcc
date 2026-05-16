/** Pure helpers for custom column keys (not a Server Actions file). */

export function slugifyColumnKey(name: string): string {
  const raw = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  const base = raw.length > 0 ? raw : "column";
  return /^[a-z]/.test(base) ? base : `c_${base}`;
}
