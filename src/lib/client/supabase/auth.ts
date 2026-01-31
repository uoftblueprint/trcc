import {
  AuthError,
  type AuthResponse,
  type AuthTokenResponse,
} from "@supabase/supabase-js";
import { createClient } from "./client";

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  const supabase = createClient();
  if (typeof window === "undefined") {
    return {
      data: { user: null, session: null },
      error: new AuthError("Email sign-up requires a browser window."),
    };
  }
  const emailRedirectTo = new URL(
    "/auth/confirm",
    window.location.origin
  ).toString();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
  return { data, error };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthTokenResponse> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}
