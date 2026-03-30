import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/client/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest): Promise<void> {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash") ?? "";
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;

  const supabase = await createClient();

  // PKCE flow: Supabase sends a `code` instead of `token_hash`
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirect("/auth/auth-code-error");
    }

    // recovery type is passed as a query param alongside the code
    if (type === "recovery") {
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

  if (type === "recovery") {
    return redirect("/reset-password");
  }

  return redirect("/volunteers");
}
