import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/client/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest): Promise<void> {
  const { searchParams } = new URL(request.url);

  const token_hash = searchParams.get("token_hash") ?? "";
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error) {
    return redirect("/auth/auth-code-error");
  }

  return redirect("/");
}
