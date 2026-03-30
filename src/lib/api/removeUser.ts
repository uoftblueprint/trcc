import { createAdminClient } from "../client/supabase/server";

type RemoveUserResponse = { success: true } | { success: false; error: string };

/**
 * Removes a user from both `auth.users` and the public `Users` table.
 *
 * Deletes the auth record first (via the Admin API) then removes the
 * corresponding row from the public `Users` table.  If the public-table
 * deletion fails the auth user is already gone, so we still report the
 * partial failure so the caller can surface it.
 */
export async function removeUser(userId: string): Promise<RemoveUserResponse> {
  if (!userId || typeof userId !== "string") {
    return { success: false, error: "Invalid user ID." };
  }

  const client = createAdminClient();

  const { error: authError } = await client.auth.admin.deleteUser(userId);

  if (authError) {
    return { success: false, error: authError.message };
  }

  const { error: tableError } = await client
    .from("Users")
    .delete()
    .eq("id", userId);

  if (tableError) {
    return {
      success: false,
      error: `Auth user removed but failed to delete Users row: ${tableError.message}`,
    };
  }

  return { success: true };
}
