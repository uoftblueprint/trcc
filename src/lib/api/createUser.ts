import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserServer } from "@/lib/api/getCurrentUserServer";
import type { Database } from "../client/supabase/types";
import { createAdminClient } from "../client/supabase/server";

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "staff";
};

export type ValidationError = {
  field: string;
  message: string;
};

export type CreateUserResponse =
  | { success: true; data: { id: string } }
  | {
      success: false;
      error: string;
      validationErrors?: ValidationError[];
    };

const ALLOWED_ROLES = ["admin", "staff"] as const;

function validateInput(input: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== "object") {
    errors.push({ field: "body", message: "Input must be an object" });
    return errors;
  }

  const data = input as Record<string, unknown>;

  if (!data["name"] || typeof data["name"] !== "string") {
    errors.push({
      field: "name",
      message: "Name is required and must be a string",
    });
  } else if (data["name"].trim().length === 0) {
    errors.push({ field: "name", message: "Name cannot be empty" });
  }

  if (!data["email"] || typeof data["email"] !== "string") {
    errors.push({
      field: "email",
      message: "Email is required and must be a string",
    });
  } else if (data["email"].trim().length === 0) {
    errors.push({ field: "email", message: "Email cannot be empty" });
  }

  if (!data["password"] || typeof data["password"] !== "string") {
    errors.push({
      field: "password",
      message: "Password is required and must be a string",
    });
  } else if (data["password"].length < 6) {
    errors.push({
      field: "password",
      message: "Password must be at least 6 characters",
    });
  }

  if (!data["role"] || typeof data["role"] !== "string") {
    errors.push({
      field: "role",
      message: "Role is required and must be a string",
    });
  } else if (
    !ALLOWED_ROLES.includes(data["role"] as (typeof ALLOWED_ROLES)[number])
  ) {
    errors.push({
      field: "role",
      message: `Role must be one of: ${ALLOWED_ROLES.join(", ")}`,
    });
  }

  return errors;
}

/**
 * Creates a new user: auth account + public.Users row.
 * Requires the admin client (service_role key).
 */
export async function createUser(
  input: CreateUserInput,
  client?: SupabaseClient<Database>
): Promise<CreateUserResponse> {
  const actor = await getCurrentUserServer();
  if (!actor || actor.role !== "admin") {
    return { success: false, error: "Unauthorized: admin access required" };
  }

  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    return { success: false, error: "Validation failed", validationErrors };
  }

  const supabase = client ?? createAdminClient();

  // 1. Create auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: input.email.trim(),
      password: input.password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message ?? "Failed to create auth user",
    };
  }

  const userId = authData.user.id;

  // 2. Insert into public.Users (upsert to handle retries where auth user exists but Users row was partially created)
  const { error: usersError } = await supabase.from("Users").upsert(
    {
      id: userId,
      name: input.name.trim(),
      role: input.role,
    },
    { onConflict: "id" }
  );

  if (usersError) {
    // Rollback: delete the auth user we just created
    await supabase.auth.admin.deleteUser(userId);
    return {
      success: false,
      error: usersError.message ?? "Failed to create user record",
    };
  }

  return { success: true, data: { id: userId } };
}
