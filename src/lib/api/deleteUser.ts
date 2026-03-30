import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../client/supabase/types";
import { createAdminClient } from "../client/supabase/server";

type DeleteUserResponse = { success: true } | { success: false; error: string };

export async function deleteUser(
  userId: string,
  client?: SupabaseClient<Database>
): Promise<DeleteUserResponse> {
  if (!userId || typeof userId !== "string") {
    return { success: false, error: "User ID is required" };
  }

  const supabase = client ?? createAdminClient();

  // 1. Delete from public.Users table first
  const { error: usersError } = await supabase
    .from("Users")
    .delete()
    .eq("id", userId);

  if (usersError) {
    return { success: false, error: usersError.message };
  }

  // 2. Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    return { success: false, error: authError.message };
  }

  return { success: true };
}
