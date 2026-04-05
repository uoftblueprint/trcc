import { NextResponse } from "next/server";

import {
  PASSWORD_RESET_GATE_COOKIE,
  passwordResetGateCookieOptions,
} from "./passwordResetGateConstants";

export { PASSWORD_RESET_GATE_COOKIE, passwordResetGateCookieOptions };

export function setPasswordResetGateCookie(response: NextResponse): void {
  response.cookies.set(
    PASSWORD_RESET_GATE_COOKIE,
    "1",
    passwordResetGateCookieOptions()
  );
}
