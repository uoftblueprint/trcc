import {
  PASSWORD_RESET_GATE_COOKIE,
  passwordResetGateCookieOptions,
} from "./passwordResetGateConstants";

export function setPasswordResetGateCookieInBrowser(): void {
  if (typeof document === "undefined") {
    return;
  }
  const { path, maxAge, sameSite, secure } = passwordResetGateCookieOptions();
  const securePart = secure ? "; Secure" : "";
  document.cookie = `${PASSWORD_RESET_GATE_COOKIE}=1; path=${path}; max-age=${maxAge}; SameSite=${sameSite}${securePart}`;
}

export function clearPasswordResetGateCookieInBrowser(): void {
  if (typeof document === "undefined") {
    return;
  }
  const { sameSite, secure } = passwordResetGateCookieOptions();
  const securePart = secure ? "; Secure" : "";
  document.cookie = `${PASSWORD_RESET_GATE_COOKIE}=; path=/; max-age=0; SameSite=${sameSite}${securePart}`;
}
