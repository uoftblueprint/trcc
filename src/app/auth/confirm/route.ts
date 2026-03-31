import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/client/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest): Promise<void> {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash") ?? "";
  const typeParam = searchParams.get("type");
  const type = (typeParam ?? "email") as EmailOtpType;
  const next = searchParams.get("next");
  const safeNext = next?.startsWith("/") ? next : null;

  const supabase = await createClient();

  // PKCE flow: Supabase sends a `code` instead of `token_hash`
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirect("/auth/auth-code-error");
    }

    if (safeNext) {
      return redirect(safeNext);
    }

    // Supabase PKCE recovery links may arrive with `code` but without a `type`.
    // In that case, default to the reset password flow.
    if (!typeParam || type === "recovery") {
      return redirect("/reset-password");
    }

    return redirect("/volunteers");
  }

  // Implicit flow: verify using token_hash
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error) {
    return redirect("/auth/auth-code-error");
  }

  if (safeNext) {
    return redirect(safeNext);
  }

  if (type === "recovery") {
    return redirect("/reset-password");
  }

  return redirect("/volunteers");
}
