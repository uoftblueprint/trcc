export const PASSWORD_RESET_GATE_COOKIE = "trcc_pw_reset_gate";

/** Align with typical reset flow time; must be ≤ usable session window for middleware. */
const MAX_AGE_SEC = 60 * 60;

export function passwordResetGateCookieOptions(): {
  path: string;
  maxAge: number;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    path: "/",
    maxAge: MAX_AGE_SEC,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  };
}
