import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";

type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];
type RoleInsert = Database["public"]["Tables"]["Roles"]["Insert"];
type RoleInput = Pick<RoleInsert, "name" | "type" | "is_active">;

type ValidationResult =
  | { valid: true; roles: RoleInput[] }
  | { valid: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRolesInput(input: unknown): ValidationResult {
  const rawRoles = Array.isArray(input) ? input : [input];

  if (rawRoles.length === 0) {
    return { valid: false, error: "Roles input cannot be empty." };
  }

  const cleanedRoles: RoleInput[] = [];

  for (const role of rawRoles) {
    if (!isRecord(role)) {
      return { valid: false, error: "Each role must be an object." };
    }

    const name = role["name"];
    const type = role["type"];
    const isActive = role["is_active"];

    if (typeof name !== "string" || name.trim().length === 0) {
      return { valid: false, error: "Role name must be a non-empty string." };
    }

    if (typeof type !== "string" || type.trim().length === 0) {
      return { valid: false, error: "Role type must be a non-empty string." };
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return { valid: false, error: "Role is_active must be a boolean." };
    }

    cleanedRoles.push({
      name: name.trim(),
      type: type.trim(),
      ...(isActive !== undefined ? { is_active: isActive } : {}),
    });
  }

  return { valid: true, roles: cleanedRoles };
}

export async function addRoles(input: unknown): Promise<RoleRow[]> {
  const validation = validateRolesInput(input);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.error), { status: 400 });
  }

  const client = await createClient();

  try {
    const { data, error, status } = await client
      .from("Roles")
      .insert(validation.roles)
      .select();

    if (error) {
      throw Object.assign(new Error(error.message || JSON.stringify(error)), {
        status: status ?? 500,
      });
    }

    return (data as RoleRow[]) || [];
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? (err as { status?: number }).status
        : 500;
    throw Object.assign(new Error(message), { status: status ?? 500 });
  }
}
