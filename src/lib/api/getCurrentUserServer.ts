import { createClient } from "@/lib/client/supabase/server";
import type { Database } from "@/lib/client/supabase/types";

type UserRow = Database["public"]["Tables"]["Users"]["Row"];

/**
 * Server-side version of getCurrentUser.
 * Uses the server Supabase client (cookies-based) to fetch the current user's row.
 */
export async function getCurrentUserServer(): Promise<UserRow | null> {
  const client = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  const { data: user, error } = await client
    .from("Users")
    .select()
    .eq("id", authUser.id)
    .single();

  if (error || !user) {
    return null;
  }

  return user as UserRow;
}
