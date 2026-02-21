import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";

type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];

/**
 * Fetches all roles from the Roles database table.
 *
 * @returns A Promise resolving to an array of RoleRow objects containing all roles.
 *   Each role object includes: type, name, is_active, created_at, and id.
 *
 * @throws Error if the Supabase query fails
 *
 * @example
 * const roles = await getRoles();
 * // [
 * //   { type: "...", name: "...", is_active: true, created_at: "...", id: 1 },
 * //   { type: "...", name: "...", is_active: false, created_at: "...", id: 2 },
 * //   ...
 * // ]
 */
export async function getRoles(): Promise<RoleRow[]> {
  const client = await createClient();

  const { data: roles, error } = await client.from("Roles").select();

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  return (roles as RoleRow[]) || [];
}
