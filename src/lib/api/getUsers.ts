import { createClient } from "@/lib/client/supabase";
import { createAdminClient } from "@/lib/client/supabase/server";
import type { Tables } from "@/lib/client/supabase/types";

export type UserRow = Tables<"Users">;

/** User row with email from auth.users (enriched by getUsers). */
export type UserRowWithEmail = UserRow & { email: string | null };

/**
 * Builds a map of user id -> email from auth.admin.listUsers (auth.users).
 * Returns empty map if admin client or listUsers fails.
 */
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
 * Fetches all users from public.Users and enriches each with email from auth.users.
 *
 * @returns A Promise resolving to an array of user rows (id, created_at, name, role, email).
 * @throws Error if the Supabase query for public.Users fails.
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

  const { data, error } = await client
    .from("Users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const msg = error.message ?? String(error);
    throw new Error(msg);
  }

  const rows = (data ?? []) as UserRow[];
  const emailById = await getEmailByIdMap();

  const withEmail: UserRowWithEmail[] = rows.map((row) => ({
    ...row,
    email: emailById.get(row.id) ?? null,
  }));

  if (process.env.NODE_ENV === "development") {
    console.log("[getUsers] row count:", withEmail.length);
  }
  return withEmail;
}
