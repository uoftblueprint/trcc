import { createClient } from "@/lib/client/supabase/client";
import type { Database } from "@/lib/client/supabase/types";

type UserRow = Database["public"]["Tables"]["Users"]["Row"];

/**
 * @example
 * const roles = await getCurrentUser();
 * //   {  name: "...", role: "...", created_at: "...", id: 1 }
 */

export async function getCurrentUser(): Promise<UserRow> {
  const client = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw new Error(authError.message || JSON.stringify(authError));
  }

  const { data: user, error } = await client
    .from("Users")
    .select()
    .eq("id", authUser.id)
    .single();

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  return user as UserRow;
}
