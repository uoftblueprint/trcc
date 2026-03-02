import { createClient } from "@/lib/client/supabase";
import type { Tables } from "@/lib/client/supabase/types";

export type UserRow = Tables<"Users">;

/**
 * Fetches all users from the public.Users table.
 *
 * @returns A Promise resolving to an array of user rows (id, created_at, name, role).
 * @throws Error if the Supabase query fails.
 */
export async function getUsers(): Promise<UserRow[]> {
  const client = await createClient();

  const { data, error } = await client
    .from("Users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const msg = error.message ?? String(error);
    throw new Error(msg);
  }

  return (data ?? []) as UserRow[];
}
