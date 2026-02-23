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

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${process.env["NEXT_PUBLIC_SITE_URL"]}/update-password`,
    });

    if (error) {
      console.log("SUPABASE ERROR FULL:", error);
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
