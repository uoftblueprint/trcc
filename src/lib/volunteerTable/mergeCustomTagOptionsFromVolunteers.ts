import type { CustomColumnRow } from "@/lib/api/customColumns";
import type { Volunteer } from "@/components/volunteers/types";

function collectTagValues(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter((s) => s.length > 0);
  }
  const s = String(raw).trim();
  return s.length > 0 ? [s] : [];
}

/**
 * For each custom tag column, returns a copy with `tag_options` including:
 * - existing presets from `CustomColumns.tag_options` (order preserved, de-duplicated)
 * - every distinct value stored in volunteer `custom_data` for that column
 * - values from unsaved `editedRows` patches (optional)
 *
 * Cell-created tags (typed in the grid) live only in `custom_data` until promoted here or in Manage Tags.
 */
export function mergeCustomTagOptionsFromVolunteers(
  columns: CustomColumnRow[],
  volunteers: Volunteer[],
  editedRows?: Record<number, Partial<Volunteer>>
): CustomColumnRow[] {
  return columns.map((c) => {
    if (c.data_type !== "tag") return c;

    const ck = c.column_key;
    const baseOrder = [
      ...new Set(
        (c.tag_options ?? []).map((t) => t.trim()).filter((t) => t.length > 0)
      ),
    ];
    const seen = new Set<string>(baseOrder);

    for (const v of volunteers) {
      const cd = v.custom_data;
      if (cd && typeof cd === "object" && !Array.isArray(cd)) {
        for (const t of collectTagValues((cd as Record<string, unknown>)[ck])) {
          seen.add(t);
        }
      }
    }

    if (editedRows) {
      for (const edit of Object.values(editedRows)) {
        const cd = edit?.custom_data;
        if (cd && typeof cd === "object" && !Array.isArray(cd)) {
          for (const t of collectTagValues(
            (cd as Record<string, unknown>)[ck]
          )) {
            seen.add(t);
          }
        }
      }
    }

    const extra = [...seen].filter((t) => !baseOrder.includes(t));
    extra.sort((a, b) => a.localeCompare(b));

    return {
      ...c,
      tag_options: [...baseOrder, ...extra],
    };
  });
}
