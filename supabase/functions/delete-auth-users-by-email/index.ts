import { createClient } from "npm:@supabase/supabase-js@2";
console.info("delete-auth-users-by-email: booting");
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Invalid JSON body",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  const emails = (body.emails ?? [])
    .map((e) => String(e).trim())
    .filter(Boolean);
  if (emails.length === 0) {
    return new Response(
      JSON.stringify({
        error: "Provide a non-empty emails array",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );
  // Delete one-by-one to provide per-email status and to surface storage ownership errors.
  const results = [];
  for (const email of emails) {
    try {
      // Find user(s) by email. This avoids trusting caller-provided ids.
      // Note: if your Auth config allows multiple identities with same email, we delete all matches.
      const { data: users, error: listErr } =
        await supabase.auth.admin.listUsers({
          // @ts-expect-error - filter typing can vary between sdk versions
          email,
          page: 1,
          perPage: 100,
        });
      if (listErr) throw listErr;
      if (!users || users.length === 0) {
        results.push({
          email,
          deleted: false,
          error: "No user found",
        });
        continue;
      }
      // Delete every matched user record.
      let deletedAny = false;
      const perUserErrors = [];
      for (const u of users) {
        const userId = u.id;
        const { error: delErr } = await supabase.auth.admin.deleteUser(userId);
        if (delErr) {
          perUserErrors.push(`${userId}: ${delErr.message ?? delErr}`);
        } else {
          deletedAny = true;
        }
      }
      results.push({
        email,
        deleted: deletedAny,
        userId: users[0]?.id,
        error: perUserErrors.length ? perUserErrors.join(" | ") : undefined,
      });
    } catch (err) {
      results.push({
        email,
        deleted: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return new Response(
    JSON.stringify({
      requested: emails.length,
      results,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
});
