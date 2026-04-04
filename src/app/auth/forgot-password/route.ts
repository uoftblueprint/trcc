import { NextResponse } from "next/server";
import { createClient } from "@/lib/client/supabase/server";

/** When testing forgot-password on localhost, use the request Origin so the email link matches dev (PKCE redirect_uri). */
function passwordResetBaseUrl(request: Request): string {
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        return parsed.origin;
      }
    } catch {
      /* use env / defaults below */
    }
  }

  const fromEnv = process.env["NEXT_PUBLIC_SITE_URL"]?.replace(/\/$/, "");
  if (fromEnv && fromEnv !== "undefined") {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* invalid env URL, fall through */
    }
  }

  if (originHeader) {
    try {
      return new URL(originHeader).origin;
    } catch {
      /* fall through */
    }
  }

  return "http://localhost:3000";
}

export async function POST(request: Request): Promise<Response> {
  let body;

  try {
    const raw = await request.text();
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  if (!body?.email || typeof body.email !== "string") {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    const { data: users, error: rpcError } = await supabase.rpc(
      "get_users_with_email"
    );

    if (rpcError) {
      console.error("Failed to fetch users:", rpcError);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const match = users?.find(
      (u: { email: string | null }) => u.email === body.email
    );

    if (!match || match.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can reset their password." },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error("Role check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  try {
    const baseUrl = passwordResetBaseUrl(request);

    // No trailing slash: Next.js may 308 /reset-password/ → /reset-password, breaking PKCE
    // if Supabase issued the code for a different path shape.
    const redirectTo = new URL(
      "/reset-password",
      baseUrl.replace(/\/$/, "")
    ).toString();

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo,
    });

    if (error) {
      console.log("SUPABASE ERROR FULL:", error);

      if (error.status === 429 || error.code === "over_email_send_rate_limit") {
        return NextResponse.json(
          {
            error:
              "Too many reset attempts. Please wait a few minutes before trying again.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: JSON.stringify(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Password reset email sent.",
    });
  } catch (err) {
    console.error("Unexpected server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
