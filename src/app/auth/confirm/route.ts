import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { setPasswordResetGateCookie } from "@/lib/auth/passwordResetGate";
import { createClient } from "@/lib/client/supabase/server";

/**
 * Same-origin path redirect only. Rejects protocol-relative URLs (`//host/…`) and
 * off-origin targets that `new URL(next, base)` can otherwise produce.
 */
function parseSafeInternalRedirect(
  request: NextRequest,
  next: string | null
): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  try {
    const base = new URL(request.url);
    const resolved = new URL(next, base);
    if (resolved.origin !== base.origin) {
      return null;
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}

function redirectResetPassword(request: NextRequest): NextResponse {
  const url = new URL("/reset-password", request.url);
  const res = NextResponse.redirect(url);
  setPasswordResetGateCookie(res);
  return res;
}

function redirectUrlWithOptionalResetGate(
  request: NextRequest,
  pathnameOrUrl: string
): NextResponse {
  const target = new URL(pathnameOrUrl, request.url);
  const isReset =
    target.pathname === "/reset-password" ||
    target.pathname.startsWith("/reset-password/");
  const res = NextResponse.redirect(target);
  if (isReset) {
    setPasswordResetGateCookie(res);
  }
  return res;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash") ?? "";
  const typeParam = searchParams.get("type");
  const type = (typeParam ?? "email") as EmailOtpType;
  const next = searchParams.get("next");
  const safeNext = parseSafeInternalRedirect(request, next);

  const supabase = await createClient();

  // PKCE flow: Supabase sends a `code` instead of `token_hash`
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/auth/auth-code-error", request.url)
      );
    }

    if (safeNext) {
      return redirectUrlWithOptionalResetGate(request, safeNext);
    }

    // Supabase PKCE recovery links may arrive with `code` but without a `type`.
    // In that case, default to the reset password flow. (Signup / other links should
    // include `type` in the URL so they are not misrouted here.)
    if (!typeParam || type === "recovery") {
      return redirectResetPassword(request);
    }

    return NextResponse.redirect(new URL("/volunteers", request.url));
  }

  // Implicit flow: verify using token_hash
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });

  if (error) {
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
  }

  if (safeNext) {
    return redirectUrlWithOptionalResetGate(request, safeNext);
  }

  if (type === "recovery") {
    return redirectResetPassword(request);
  }

  return NextResponse.redirect(new URL("/volunteers", request.url));
}
