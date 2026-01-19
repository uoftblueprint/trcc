import { type AuthResponse, type AuthTokenResponse } from "@supabase/supabase-js";
import { createClient } from "./client";

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
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
