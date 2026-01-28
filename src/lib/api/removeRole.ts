import { createClient } from "../client/supabase/server";

/**
 * Removes a Role and associated VolunteerRole rows by name.
 * Note that this assumes that the deletion to cascade to the VolunteerRoles
 * table.
 * @param roleName - The name of the role to remove.
 */
type RemoveRoleResponse =
  | { success: true; error?: never }
  | { success: false; error: string };

export async function removeRole(
  roleName: string
): Promise<RemoveRoleResponse> {
  const client = await createClient();
  try {
    const { data, error } = await client
      .from("Roles")
      .delete()
      .eq("name", roleName)
      .select();

    if (error) throw error;

    // No role with that name was found
    if (data.length === 0)
      return { success: false, error: `Role with name ${roleName} not found` };

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { success: false, error: message };
  }
}
