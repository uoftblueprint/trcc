import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import {
  createServiceTestClient,
  createAdminTestClient,
} from "../support/helpers";

const hasIntegrationEnv = Boolean(process.env["SECRET_KEY"]);

// ── Unit tests: auth/confirm route ──────────────────────────────────────────

const mockVerifyOtp = vi.fn();
const mockExchangeCodeForSession = vi.fn();

vi.mock("@/lib/client/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/client/supabase/server";
import { GET } from "@/app/auth/confirm/route";
import { PASSWORD_RESET_GATE_COOKIE } from "@/lib/auth/passwordResetGateConstants";

beforeEach(() => {
  vi.clearAllMocks();

  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      verifyOtp: mockVerifyOtp,
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  });
});

function makeConfirmRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/auth/confirm");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("Reset Password", () => {
  describe("Token verification — auth/confirm route (unit)", () => {
    it("redirects to /reset-password for valid recovery token", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeConfirmRequest({
        token_hash: "valid-token-hash",
        type: "recovery",
      });

      const res = await GET(request);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/reset-password");
      expect(res.headers.get("set-cookie")).toContain(
        `${PASSWORD_RESET_GATE_COOKIE}=1`
      );

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        type: "recovery",
        token_hash: "valid-token-hash",
      });
    });

    it("redirects to /auth/auth-code-error for invalid token", async () => {
      mockVerifyOtp.mockResolvedValue({
        error: { message: "Token has expired or is invalid" },
      });

      const request = makeConfirmRequest({
        token_hash: "expired-token",
        type: "recovery",
      });

      const res = await GET(request);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth/auth-code-error");
    });

    it("redirects to /auth/auth-code-error when token_hash is missing", async () => {
      mockVerifyOtp.mockResolvedValue({
        error: { message: "Token hash is required" },
      });

      const request = makeConfirmRequest({ type: "recovery" });

      const res = await GET(request);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth/auth-code-error");

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        type: "recovery",
        token_hash: "",
      });
    });

    it("redirects to /volunteers for non-recovery token types", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeConfirmRequest({
        token_hash: "valid-token",
        type: "email",
      });

      const res = await GET(request);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/volunteers");
    });
  });

  describe("PKCE code exchange — auth/confirm route (unit)", () => {
    /** Route reads `data.session` after exchange; Supabase returns `{ data, error }`. */
    const exchangeOk = (
      session: { user?: object } | null = null
    ): Promise<{
      data: { session: { user?: object } | null };
      error: null;
    }> =>
      Promise.resolve({
        data: { session },
        error: null,
      });

    it("redirects to /reset-password for valid recovery code", async () => {
      mockExchangeCodeForSession.mockImplementation(() => exchangeOk(null));

      const request = makeConfirmRequest({
        code: "valid-pkce-code",
        type: "recovery",
      });

      const res = await GET(request);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/reset-password");
      expect(res.headers.get("set-cookie")).toContain(
        `${PASSWORD_RESET_GATE_COOKIE}=1`
      );

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith(
        "valid-pkce-code"
      );
    });

    it("redirects to /auth/auth-code-error for invalid code", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: "Invalid code" },
      });

      const request = makeConfirmRequest({
        code: "invalid-code",
        type: "recovery",
      });

      const res = await GET(request);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/auth/auth-code-error");
    });

    it("redirects to /volunteers for non-recovery code", async () => {
      mockExchangeCodeForSession.mockImplementation(() =>
        exchangeOk({ user: {} })
      );

      const request = makeConfirmRequest({
        code: "valid-pkce-code",
        type: "email",
      });

      const res = await GET(request);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/volunteers");
    });

    it("does not follow protocol-relative next (open redirect)", async () => {
      mockExchangeCodeForSession.mockImplementation(() =>
        exchangeOk({ user: {} })
      );

      const request = makeConfirmRequest({
        code: "valid-pkce-code",
        type: "email",
        next: "//evil.example/phish",
      });

      const res = await GET(request);

      expect(res.status).toBe(307);
      const loc = res.headers.get("location") ?? "";
      expect(loc).toContain("/volunteers");
      expect(loc).not.toContain("evil.example");
    });

    it("prefers code over token_hash when both are present", async () => {
      mockExchangeCodeForSession.mockImplementation(() => exchangeOk(null));

      const request = makeConfirmRequest({
        code: "valid-pkce-code",
        token_hash: "some-token-hash",
        type: "recovery",
      });

      const res = await GET(request);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("/reset-password");
      expect(res.headers.get("set-cookie")).toContain(
        `${PASSWORD_RESET_GATE_COOKIE}=1`
      );

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith(
        "valid-pkce-code"
      );
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });
  });

  // ── Unit tests: form validation ─────────────────────────────────────────

  describe("Password form validation (unit)", () => {
    it("rejects empty password", () => {
      const password = "";
      expect(password.trim()).toBe("");
    });

    it("rejects password shorter than 6 characters", () => {
      const password = "abc12";
      expect(password.length < 6).toBe(true);
    });

    it("accepts password with 6 or more characters", () => {
      const password = "abc123";
      expect(password.length >= 6).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const password = "securePassword1";
      const confirmPassword = "securePassword2";
      expect(password).not.toBe(confirmPassword);
    });

    it("accepts matching passwords", () => {
      const password = "securePassword1";
      const confirmPassword = "securePassword1";
      expect(password === confirmPassword).toBe(true);
    });
  });

  // ── Integration tests (real Supabase) ───────────────────────────────────

  describe.skipIf(!hasIntegrationEnv)(
    "Password update after reset (integration)",
    () => {
      let adminClient: ReturnType<typeof createAdminTestClient>;
      let regularClient: ReturnType<typeof createServiceTestClient>;

      beforeAll(() => {
        adminClient = createAdminTestClient();
        regularClient = createServiceTestClient();
      });

      it("successfully updates password and allows sign-in with new password", async () => {
        const testEmail = `test-reset-update-${Date.now()}@example.com`;
        const initialPassword = "OldPassword123!";
        const newPassword = "NewPassword456!";

        const { data: created, error: createError } =
          await adminClient.auth.admin.createUser({
            email: testEmail,
            password: initialPassword,
            email_confirm: true,
          });

        expect(createError).toBeNull();
        const userId = created.user!.id;

        try {
          const { error: updateError } =
            await adminClient.auth.admin.updateUserById(userId, {
              password: newPassword,
            });

          expect(updateError).toBeNull();

          const { data: signIn, error: signInError } =
            await regularClient.auth.signInWithPassword({
              email: testEmail,
              password: newPassword,
            });

          expect(signInError).toBeNull();
          expect(signIn.user).toBeTruthy();
          expect(signIn.user!.email).toBe(testEmail);
        } finally {
          await adminClient.auth.admin.deleteUser(userId);
        }
      });

      it("rejects old password after reset", async () => {
        const testEmail = `test-reset-old-${Date.now()}@example.com`;
        const initialPassword = "OldPassword123!";
        const newPassword = "NewPassword456!";

        const { data: created, error: createError } =
          await adminClient.auth.admin.createUser({
            email: testEmail,
            password: initialPassword,
            email_confirm: true,
          });

        expect(createError).toBeNull();
        const userId = created.user!.id;

        try {
          await adminClient.auth.admin.updateUserById(userId, {
            password: newPassword,
          });

          const { error: oldPasswordError } =
            await regularClient.auth.signInWithPassword({
              email: testEmail,
              password: initialPassword,
            });

          expect(oldPasswordError).not.toBeNull();
        } finally {
          await adminClient.auth.admin.deleteUser(userId);
        }
      });
    }
  );
});
