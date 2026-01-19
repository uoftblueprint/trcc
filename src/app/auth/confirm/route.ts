import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/client/supabase/server";
import { redirect } from "next/navigation";

export async function GET(request: NextRequest): Promise<void> {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const safeNext = getSafeRedirect(next, request.url);

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      // redirect user to specified redirect URL or root of app
      
      return redirect(safeNext);
    }
  }

  // redirect the user to an error page with some instructions
  return redirect("/auth/auth-code-error");
}

function getSafeRedirect(nextParam: string, requestUrl: string): string {
  if (nextParam.startsWith("/") && !nextParam.startsWith("//")) {
    return nextParam;
  }

  try {
    const requestOrigin = new URL(requestUrl).origin;
    const candidate = new URL(nextParam, requestOrigin);
    if (candidate.origin === requestOrigin) {
      return `${candidate.pathname}${candidate.search}${candidate.hash}`;
    }
  } catch {
    // Fall through to default redirect.
  }

  return "/";
}
