import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/client/supabase/types";

type DbClient = SupabaseClient<Database>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing env var ${name}. For DB tests, ensure local Supabase is running and your test env is configured.`
    );
  }
  return value;
}

export function getTestSupabaseUrl(): string {
  return requireEnv("API_URL");
}

export function getTestAnonKey(): string {
  return requireEnv("PUBLISHABLE_KEY");
}

export function getTestServiceRoleKey(): string {
  return requireEnv("SERVICE_ROLE_KEY");
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
