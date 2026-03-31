import { NextResponse } from "next/server";
import { createClient } from "@/lib/client/supabase/server";

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
    const baseUrl =
      process.env["NEXT_PUBLIC_SITE_URL"] ??
      request.headers.get("origin") ??
      "http://localhost:3000";

    const callbackUrl = new URL("/auth/confirm", baseUrl.replace(/\/$/, ""));
    callbackUrl.searchParams.set("next", "/reset-password");

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: callbackUrl.toString(),
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
