import { createAdminClient } from "../client/supabase/server";

/**
 * Removes a Role and associated VolunteerRole rows by name and type.
 * Note that this assumes that the deletion to cascade to the VolunteerRoles
 * table.
 * @param roleName - The name of the role to remove.
 * @param roleType - The type of the role to remove.
 */
type RemoveRoleResponse =
  | { success: true; error?: never }
  | { success: false; error: string };

/**
 * Deletes a role by primary key (preferred for UI that already has the row id).
 */
export async function removeRoleById(
  roleId: number
): Promise<RemoveRoleResponse> {
  const client = createAdminClient();
  try {
    if (!Number.isInteger(roleId) || roleId <= 0) {
      return { success: false, error: "Invalid role id" };
    }

    const { data, error } = await client
      .from("Roles")
      .delete()
      .eq("id", roleId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        success: false,
        error: `Role with id ${roleId} not found`,
      };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { success: false, error: message };
  }
}

export async function removeRole(
  roleName: string,
  roleType: string
): Promise<RemoveRoleResponse> {
  const client = createAdminClient();
  try {
    const { data, error } = await client
      .from("Roles")
      .delete()
      .eq("name", roleName)
      .eq("type", roleType)
      .select();

    if (error) throw error;

    // No role with that name was found
    if (data.length === 0)
      return {
        success: false,
        error: `Role with name ${roleName} and type ${roleType} not found`,
      };

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return { success: false, error: message };
  }
}
