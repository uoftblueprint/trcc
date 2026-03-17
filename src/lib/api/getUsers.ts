import { createClient } from "@/lib/client/supabase";
import { createAdminClient } from "@/lib/client/supabase/server";
import type { Tables } from "@/lib/client/supabase/types";

export type UserRow = Tables<"Users">;

/** User row with email from auth.users (enriched by getUsers). */
export type UserRowWithEmail = UserRow & { email: string | null };

/** Builds id -> email from auth.admin.listUsers. Returns empty map on failure. */
async function getEmailByIdMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({
      perPage: 1000,
      page: 1,
    });
    if (error || !data?.users) return map;
    for (const u of data.users) {
      if (u.email) map.set(u.id, u.email);
    }
  } catch {
    return map;
  }
  return map;
}

/**
 * Fetches all users from public.Users with email from auth.users.
 * Tries RPC get_users_with_email first; if not available, falls back to
 * select + auth.admin.listUsers.
 */
export async function getUsers(): Promise<UserRowWithEmail[]> {
  const client = await createClient();

  if (process.env.NODE_ENV === "development" && process.env["API_URL"]) {
    try {
      const host = new URL(process.env["API_URL"]).hostname;
      console.log("[getUsers] Supabase host:", host);
    } catch {
      console.log("[getUsers] API_URL missing or invalid");
    }
  }

  const { data, error } = await client.rpc("get_users_with_email");

  const isFunctionMissing =
    error &&
    typeof (error as { message?: string }).message === "string" &&
    (error as { message: string }).message.includes(
      "Could not find the function"
    );

  if (!error) {
    const withEmail = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      email:
        typeof r["email"] === "string" && r["email"] !== "" ? r["email"] : null,
    })) as UserRowWithEmail[];
    if (process.env.NODE_ENV === "development") {
      console.log("[getUsers] row count:", withEmail.length);
    }
    return withEmail;
  }

  if (!isFunctionMissing) {
    const msg =
      typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : String(error);
    throw new Error(msg);
  }

  const { data: rowsData, error: selectError } = await client
    .from("Users")
    .select("*")
    .order("created_at", { ascending: false });

  if (selectError) {
    throw new Error(selectError.message ?? String(selectError));
  }

  const rows = (rowsData ?? []) as UserRow[];
  const emailById = await getEmailByIdMap();
  const withEmail: UserRowWithEmail[] = rows.map((row) => ({
    ...row,
    email: emailById.get(row.id) ?? null,
  }));

  if (process.env.NODE_ENV === "development") {
    console.log("[getUsers] row count (fallback):", withEmail.length);
  }
  return withEmail;
}
