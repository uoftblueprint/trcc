import toast, { type ToastOptions } from "react-hot-toast";

/** Substrings returned by server when the current user lacks permission. */
const FORBIDDEN_MARKERS = ["Unauthorized", "admin access required"] as const;

export function isForbiddenOperationMessage(
  message: string | undefined | null
): boolean {
  if (!message || typeof message !== "string") return false;
  return FORBIDDEN_MARKERS.some((m) => message.includes(m));
}

export function toastForbiddenOperation(options?: ToastOptions): void {
  toast.error("You don't have permission to do that.", options);
}

/**
 * If the message is a permission error, shows a toast and returns true so callers
 * can skip a duplicate generic error.
 */
export function notifyIfForbidden(message: string | undefined | null): boolean {
  if (!isForbiddenOperationMessage(message)) return false;
  toastForbiddenOperation();
  return true;
}

/** For caught errors from server actions (e.g. requireAdmin throws). */
export function notifyIfForbiddenError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return notifyIfForbidden(msg);
}
