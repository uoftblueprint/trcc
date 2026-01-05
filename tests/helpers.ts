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
  // `tests/setup.ts` defaults this to http://127.0.0.1:54321
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getTestAnonKey(): string {
  // `tests/setup.ts` maps this from NEXT_PUBLIC_SUPABASE_LOCAL_PUBLISHABLE_KEY
  return requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}

export function getTestServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Use this client when you want your test to behave like the app:
 * - uses the publishable (anon) key
 * - subject to RLS (if enabled)
 */
export function createAnonTestClient(): DbClient {
  // Disable auth to prevent Supabase from trying to parse the `Authorization` header as a JWT.
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

/**
 * Use this client for setup/teardown in tests (insert, cleanup rows):
 * - uses the service role key (bypasses RLS)
 */
export function createServiceTestClient(): DbClient {
  return createClient<Database>(getTestSupabaseUrl(), getTestServiceRoleKey(), {
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

/**
 * Delete rows matching a LIKE pattern. Use for string columns with TEST_ prefix.
 *
 * This intentionally avoids TRUNCATE because FK relationships often make truncation tricky.
 */
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

/**
 * Delete rows where a numeric column is >= a threshold.
 * Useful for cleaning up test cohorts by year (e.g., year >= 2099).
 */
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
