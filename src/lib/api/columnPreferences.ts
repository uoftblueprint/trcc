"use server";

import { createAdminClient } from "@/lib/client/supabase/server";
import type { Json } from "@/lib/client/supabase/types";

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
};

export async function getColumnPreferencesForUser(
  userId: string
): Promise<ColumnPreferences> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("UserColumnPreferences")
    .select("column_order, hidden_columns")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    return { column_order: [], hidden_columns: [] };
  }

  return {
    column_order: parseStringArray(data.column_order, []),
    hidden_columns: parseStringArray(data.hidden_columns, []),
  };
}

export async function saveColumnPreferencesForUser(
  userId: string,
  column_order: string[],
  hidden_columns: string[]
): Promise<{ success: boolean; error?: string }> {
  const client = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await client.from("UserColumnPreferences").upsert(
    {
      user_id: userId,
      column_order: column_order as unknown as Json,
      hidden_columns: hidden_columns as unknown as Json,
      updated_at: now,
    },
    { onConflict: "user_id" }
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}
