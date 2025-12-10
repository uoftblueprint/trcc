import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/client/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type TableName = keyof Database["public"]["Tables"];

function getTestConfig(): { apiUrl: string; key: string } {
  const apiUrl: string = process.env["API_URL"]!;

  if (!apiUrl) throw new Error("API_URL is not set");

  const key: string = process.env["PUBLISHABLE_KEY"]!;

  if (!key) throw new Error("PUBLISHABLE_KEY is not set");

  return { apiUrl, key };
}

export function createTestClient(): SupabaseClient<Database> {
  const { apiUrl, key } = getTestConfig();
  return createSupabaseClient<Database>(apiUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createAnonTestClient(): SupabaseClient<Database> {
  const { apiUrl, key } = getTestConfig();

  return createSupabaseClient<Database>(apiUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function deleteAllFromTables(
  client: SupabaseClient<Database>
): Promise<void> {
  const deleteOrder: TableName[] = [
    "VolunteerCohorts",
    "VolunteerRoles",
    "Volunteers",
    "Cohorts",
    "Roles",
    "Users",
  ];

  for (const tableName of deleteOrder) {
    const { data: allRows } = await client.from(tableName).select("id");

    if (allRows && allRows.length > 0) {
      const rows = allRows as unknown as Array<{ id: number }>;
      const ids = rows.map((row) => row.id);
      const filteredIds = ids.filter(
        (id): id is number => id !== undefined && id !== null
      );

      if (filteredIds.length > 0) {
        await client.from(tableName).delete().in("id", filteredIds);
      }
    }
  }
}
