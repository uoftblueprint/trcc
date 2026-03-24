// Supabase client creation for server-side rendering

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createBrowserClient } from "@supabase/supabase-js";
import * as process from "node:process";

function getSupabaseUrl(preferLocal: boolean): string {
  const url = preferLocal
    ? (process.env["API_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"])
    : (process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? process.env["API_URL"]);
  if (!url) {
    throw new Error("Missing env var API_URL or NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

function getPublishableKey(preferLocal: boolean): string {
  const key = preferLocal
    ? (process.env["PUBLISHABLE_KEY"] ??
      process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"])
    : (process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ??
      process.env["PUBLISHABLE_KEY"]);
  if (!key) {
    throw new Error(
      "Missing env var PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }
  return key;
}

// During tests we prefer to use the plain `@supabase/supabase-js` client
// because Next's `cookies()` and `@supabase/ssr` internals are not
// available in the Vitest environment.
export async function createClient(): Promise<SupabaseClient<Database>> {
  if (
    process.env.NODE_ENV === "test" ||
    process.env["SUPABASE_TESTING"] === "1" ||
    process.env.NODE_ENV === "development"
  ) {
    // In tests we connect to a local Supabase instance
    // and do not use SSR or cookies
    console.log("Creating Supabase client locally for tests...");

    return createBrowserClient<Database>(
      getSupabaseUrl(true),
      getPublishableKey(true),
      {
        global: {
          headers: {
            Authorization: "",
          },
        },
      }
    );
  }

  // In non-test environments we use the SSR client with cookies
  console.log("Creating Supabase SSR client...");
  const cookieStore = await cookies();
  return createServerClient<Database>(
    getSupabaseUrl(false),
    getPublishableKey(false),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = getSupabaseUrl(false);
  const serviceRoleKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SERVICE_ROLE_KEY"];

  if (!serviceRoleKey) {
    throw new Error(
      "Missing env var SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createBrowserClient<Database>(supabaseUrl, serviceRoleKey, {
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
