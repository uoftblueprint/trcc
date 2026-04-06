"use server";

import { createAdminClient } from "@/lib/client/supabase/server";
import type { Json } from "@/lib/client/supabase/types";
import { sanitizeHiddenColumnIds } from "@/lib/volunteerTable/columnVisibility";
import {
  BUILT_IN_VOLUNTEER_COLUMN_IDS,
  orderedColumnIds,
  tableIdForCustomColumn,
} from "@/lib/volunteerTable/columnOrder";
import { listCustomColumns } from "./customColumns";
import { getVolunteerTableGlobalSettings } from "./volunteerTableGlobalSettings";

function parseStringArray(
  json: Json | null | undefined,
  fallback: string[]
): string[] {
  if (!Array.isArray(json)) return fallback;
  return json.filter((x): x is string => typeof x === "string");
}

export type ColumnPreferences = {
  column_order: string[];
  hidden_columns: string[];
  /** When prefs were last saved; used to merge in new custom columns without re-adding removed ones. */
  prefs_updated_at: string | null;
};

/** Staff: merged hidden for table rendering; personal-only prefs remain in `hidden_columns`. */
export type ColumnPreferencesWithStaffExtras = ColumnPreferences & {
  hidden_columns_effective?: string[];
};

export async function resolveStaffColumnPreferences(
  prefs: ColumnPreferences
): Promise<ColumnPreferencesWithStaffExtras> {
  const global = await getVolunteerTableGlobalSettings();
  const excludeSet = new Set(global.admin_hidden_columns);
  const allCustom = await listCustomColumns();
  const visibleCustom = allCustom.filter(
    (c) => !excludeSet.has(tableIdForCustomColumn(c.column_key))
  );
  const builtInIds = [...BUILT_IN_VOLUNTEER_COLUMN_IDS];
  const savedOrderFiltered = prefs.column_order.filter(
    (id) => !excludeSet.has(id)
  );
  const column_order = orderedColumnIds(
    builtInIds,
    visibleCustom,
    savedOrderFiltered,
    prefs.prefs_updated_at
  ).filter((id) => !excludeSet.has(id));
  const hidden_columns_effective = sanitizeHiddenColumnIds([
    ...prefs.hidden_columns,
    ...global.admin_hidden_columns,
  ]);
  return {
    column_order,
    hidden_columns: prefs.hidden_columns,
    prefs_updated_at: prefs.prefs_updated_at,
    hidden_columns_effective,
  };
}

export async function getColumnPreferencesForUser(
  userId: string
): Promise<ColumnPreferences> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("UserColumnPreferences")
    .select("column_order, hidden_columns, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    return {
      column_order: [],
      hidden_columns: [],
      prefs_updated_at: null,
    };
  }

  return {
    column_order: parseStringArray(data.column_order, []),
    hidden_columns: sanitizeHiddenColumnIds(
      parseStringArray(data.hidden_columns, [])
    ),
    prefs_updated_at: data.updated_at ?? null,
  };
}

export async function saveColumnPreferencesForUser(
  userId: string,
  column_order: string[],
  hidden_columns: string[]
): Promise<{ success: boolean; error?: string }> {
  const client = createAdminClient();
  const now = new Date().toISOString();
  const hiddenSafe = sanitizeHiddenColumnIds(hidden_columns);

  const { error } = await client.from("UserColumnPreferences").upsert(
    {
      user_id: userId,
      column_order: column_order as unknown as Json,
      hidden_columns: hiddenSafe as unknown as Json,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}
