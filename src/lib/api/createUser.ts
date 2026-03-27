"use server";

import { createAdminClient } from "../client/supabase/server";

type CreateUserInput = {
  email: string;
  password: string;
  name?: string | undefined;
  role: "admin" | "staff";
};

type CreateUserResponse =
  | { data: { id: string }; error?: never }
  | { data?: never; error: string };

/**
 * Creates a user in both auth.users and public.Users tables.
 * Uses the admin client to bypass RLS and create auth credentials directly.
 *
 * Called from the Manage Staff page when an admin presses "+ New User".
 */
export async function createUser(
  input: CreateUserInput
): Promise<CreateUserResponse> {
  const { email, password, name, role } = input;

  if (!email || !email.trim()) {
    return { error: "Email is required" };
  }
  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }
  if (!role || !["admin", "staff"].includes(role)) {
    return { error: "Role must be 'admin' or 'staff'" };
  }

  const supabase = createAdminClient();

  // 1. Create the user in auth.users with confirmed email
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

  if (authError) {
    return { error: authError.message };
  }

  const userId = authData.user.id;

  // 2. Insert into public.Users table with role and optional name
  const { error: insertError } = await supabase.from("Users").insert({
    id: userId,
    name: name?.trim() || null,
    role,
  });

  if (insertError) {
    // Rollback: delete the auth user if public.Users insert fails
    await supabase.auth.admin.deleteUser(userId);
    return { error: insertError.message };
  }

  return { data: { id: userId } };
}
