"use server";

import { createAdminClient } from "@/lib/client/supabase/server";
import type { Database } from "@/lib/client/supabase/types";

type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];
type RoleInsert = Database["public"]["Tables"]["Roles"]["Insert"];
type RoleInput = Pick<RoleInsert, "name" | "type" | "is_active">;

// Valid role types
const VALID_ROLE_TYPES = ["prior", "current", "future_interest"] as const;
export type RoleType = (typeof VALID_ROLE_TYPES)[number];

// Validation error type
export type ValidationError = {
  field: string;
  message: string;
};

// Response type for the API function
export type CreateRoleResponse =
  | { success: true; data: RoleRow[] }
  | {
      success: false;
      error: string;
      validationErrors?: ValidationError[];
      dbError?: unknown;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates role input data
 * @param input - The role data to validate (single object or array)
 * @returns An array of validation errors (empty if valid)
 */
function validateRolesInput(input: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  const rawRoles = Array.isArray(input) ? input : [input];

  if (rawRoles.length === 0) {
    errors.push({
      field: "general",
      message: "Roles input cannot be empty.",
    });
    return errors;
  }

  for (let i = 0; i < rawRoles.length; i++) {
    const role = rawRoles[i];
    const prefix = rawRoles.length > 1 ? `role[${i}]` : "role";

    if (!isRecord(role)) {
      errors.push({
        field: prefix,
        message: "Each role must be an object.",
      });
      continue;
    }

    const name = role["name"];
    const type = role["type"];
    const isActive = role["is_active"];

    // Validate name
    if (!name || typeof name !== "string") {
      errors.push({
        field: `${prefix}.name`,
        message: "Role name is required and must be a string.",
      });
    } else if (name.trim().length === 0) {
      errors.push({
        field: `${prefix}.name`,
        message: "Role name cannot be empty.",
      });
    }

    // Validate type
    if (!type || typeof type !== "string") {
      errors.push({
        field: `${prefix}.type`,
        message: "Role type is required and must be a string.",
      });
    } else if (type.trim().length === 0) {
      errors.push({
        field: `${prefix}.type`,
        message: "Role type cannot be empty.",
      });
    } else if (!VALID_ROLE_TYPES.includes(type.trim() as RoleType)) {
      errors.push({
        field: `${prefix}.type`,
        message: `Role type must be one of: ${VALID_ROLE_TYPES.join(", ")}.`,
      });
    }

    // Validate is_active (optional)
    if (isActive !== undefined && typeof isActive !== "boolean") {
      errors.push({
        field: `${prefix}.is_active`,
        message: "Role is_active must be a boolean.",
      });
    }
  }

  return errors;
}

/**
 * Builds cleaned role inputs for database insertion
 */
function buildRoleInputs(input: unknown): RoleInput[] {
  const rawRoles = Array.isArray(input) ? input : [input];
  const cleanedRoles: RoleInput[] = [];

  for (const role of rawRoles) {
    if (!isRecord(role)) continue;

    const name = role["name"];
    const type = role["type"];
    const isActive = role["is_active"];

    if (typeof name === "string" && typeof type === "string") {
      cleanedRoles.push({
        name: name.trim(),
        type: type.trim() as RoleType,
        is_active: typeof isActive === "boolean" ? isActive : true,
      });
    }
  }

  return cleanedRoles;
}

/**
 * Creates one or more roles in the database.
 *
 * @param input - A single role object or an array of role objects
 * @returns A response object indicating success or failure
 */
export async function createRole(input: unknown): Promise<CreateRoleResponse> {
  try {
    // Validate input
    const validationErrors = validateRolesInput(input);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: "Validation failed",
        validationErrors,
      };
    }

    const roleInputs = buildRoleInputs(input);
    const client = createAdminClient();

    const { data, error } = await client
      .from("Roles")
      .insert(roleInputs)
      .select();

    if (error) {
      console.error("Database error while creating role:", error);

      // Check for duplicate key error
      if (error.code === "23505") {
        return {
          success: false,
          error: "A role with this name already exists",
          dbError: error,
        };
      }

      return {
        success: false,
        error: error.message ?? "Failed to create role in database",
        dbError: error,
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Failed to retrieve role data after insertion",
      };
    }

    return {
      success: true,
      data: data as RoleRow[],
    };
  } catch (error) {
    console.error("Unexpected error while creating role:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
