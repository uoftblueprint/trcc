// Supabase client creation for server-side rendering

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createBrowserClient } from "@supabase/supabase-js";
import * as process from "node:process";

// During tests we prefer to use the plain `@supabase/supabase-js` client
// because Next's `cookies()` and `@supabase/ssr` internals are not
// available in the Vitest environment.
export async function createClient(): Promise<SupabaseClient<Database>> {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env["API_URL"];
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env["PUBLISHABLE_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase URL or key. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  if (
    process.env.NODE_ENV === "test" ||
    process.env["SUPABASE_TESTING"] === "1"
  ) {
    // In tests we connect to a local Supabase instance
    // and do not use SSR or cookies
    console.log("Creating Supabase client locally for tests...");

    return createBrowserClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: "",
        },
      },
    });
  }

  // In non-test environments we use the SSR client with cookies
  console.log("Creating Supabase SSR client...");
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
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
  });
}
