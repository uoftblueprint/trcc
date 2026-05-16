"use server";

import { createAdminClient } from "../client/supabase/server";
import type { Json } from "../client/supabase/types";
import { sanitizeHiddenColumnIds } from "../volunteerTable/columnVisibility";

const SINGLETON_ID = 1;

export type VolunteerTableGlobalSettings = {
  admin_hidden_columns: string[];
};

export async function getVolunteerTableGlobalSettings(): Promise<VolunteerTableGlobalSettings> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("VolunteerTableGlobalSettings")
    .select("admin_hidden_columns")
    .eq("id", SINGLETON_ID)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    return { admin_hidden_columns: [] };
  }
  const raw = data.admin_hidden_columns;
  if (!Array.isArray(raw)) {
    return { admin_hidden_columns: [] };
  }
  return {
    admin_hidden_columns: sanitizeHiddenColumnIds(
      raw.filter((x): x is string => typeof x === "string")
    ),
  };
}

export async function saveVolunteerTableGlobalSettings(
  admin_hidden_columns: string[]
): Promise<{ success: boolean; error?: string }> {
  const client = createAdminClient();
  const now = new Date().toISOString();
  const safe = sanitizeHiddenColumnIds(admin_hidden_columns);
  const { error } = await client.from("VolunteerTableGlobalSettings").upsert(
    {
      id: SINGLETON_ID,
      admin_hidden_columns: safe as unknown as Json,
      updated_at: now,
    },
    { onConflict: "id" }
  );
  if (error) return { success: false, error: error.message };
  return { success: true };
}
