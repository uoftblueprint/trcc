import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/client/supabase/types";

export type DbClient = SupabaseClient<Database>;

function requireEnv(...names: string[]): string {
  const value = names.map((name) => process.env[name]).find(Boolean);
  if (!value) {
    throw new Error(
      `Missing env var (${names.join(" or ")}). For DB tests, ensure local Supabase is running and your test env is configured.`
    );
  }
  return value;
}

export function getTestSupabaseUrl(): string {
  return requireEnv("API_URL", "NEXT_PUBLIC_SUPABASE_URL");
}

export function getTestAnonKey(): string {
  return requireEnv(
    "PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export function getTestServiceRoleKey(): string {
  return requireEnv("SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY");
}

export function createAnonTestClient(): DbClient {
  // Disable auth to prevent Supabase from trying to parse the `Authorization` header as a JWT
  return createClient<Database>(getTestSupabaseUrl(), getTestAnonKey(), {
    global: {
      headers: {
        Authorization: "",
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Use this client for setup/teardown in tests (insert, cleanup rows), bypasses RLS
export function createServiceTestClient(): DbClient {
  return createClient<Database>(getTestSupabaseUrl(), getTestServiceRoleKey(), {
    global: {
      headers: {
        Authorization: `Bearer ${getTestServiceRoleKey()}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// Delete rows matching pattern (e.g., "TEST_%")
export async function deleteWhere<
  TTable extends keyof Database["public"]["Tables"],
  TColumn extends keyof Database["public"]["Tables"][TTable]["Row"] & string,
>(
  client: DbClient,
  table: TTable,
  column: TColumn,
  pattern: string
): Promise<void> {
  const { error } = await client.from(table).delete().like(column, pattern);
  if (error) {
    throw new Error(`Cleanup failed for ${String(table)}: ${error.message}`);
  }
}

// Delete rows based on a numeric column >= a threshold
export async function deleteWhereGte<
  TTable extends keyof Database["public"]["Tables"],
  TColumn extends keyof Database["public"]["Tables"][TTable]["Row"] & string,
>(
  client: DbClient,
  table: TTable,
  column: TColumn,
  value: number
): Promise<void> {
  const { error } = await client.from(table).delete().gte(column, value);
  if (error) {
    throw new Error(`Cleanup failed for ${String(table)}: ${error.message}`);
  }
}

export function createAdminTestClient(): DbClient {
  const serviceRoleKey = getTestServiceRoleKey();
  return createClient<Database>(getTestSupabaseUrl(), serviceRoleKey, {
    global: {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
