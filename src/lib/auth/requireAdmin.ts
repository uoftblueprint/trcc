import { getCurrentUserServer } from "@/lib/api/getCurrentUserServer";

/**
 * Ensures the current session is an app administrator.
 * Used by server actions and privileged API helpers.
 */
export async function requireAdmin(): Promise<void> {
  const user = await getCurrentUserServer();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: admin access required");
  }
}
