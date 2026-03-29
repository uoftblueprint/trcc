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

  console.log("[getCurrentUser] auth user id:", authUser?.id ?? "NONE");
  console.log("[getCurrentUser] auth user email:", authUser?.email ?? "NONE");
  console.log("[getCurrentUser] auth user role:", authUser?.role ?? "NONE");
  console.log("[getCurrentUser] auth error:", authError?.message ?? "none");

  if (authError) {
    throw new Error(authError.message || JSON.stringify(authError));
  }

  const { data: user, error } = await client
    .from("Users")
    .select()
    .eq("id", authUser.id)
    .single();

  console.log(
    "[getCurrentUser] Users query error:",
    error ? JSON.stringify(error) : "none"
  );
  console.log(
    "[getCurrentUser] user row:",
    user
      ? JSON.stringify({
          id: (user as UserRow).id,
          role: (user as UserRow).role,
          name: (user as UserRow).name,
        })
      : "NULL"
  );

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  return user as UserRow;
}
