import { createClient } from "./client";

/** Exchange PKCE recovery code at the current browser URL (redirect_uri must match Supabase). */
export async function exchangePkceRecoveryCode(
  code: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = createClient();
  const { error: exchangeError } =
    await client.auth.exchangeCodeForSession(code);
  const {
    data: { session },
  } = await client.auth.getSession();

  if (exchangeError && !session) {
    return { ok: false, message: exchangeError.message };
  }

  return { ok: true };
}
