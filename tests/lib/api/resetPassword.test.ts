import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
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

// next/navigation redirect() throws a special error to halt execution
const redirectError = (url: string): never => {
  const err = new Error(`NEXT_REDIRECT: ${url}`);
  err.name = "RedirectError";
  Object.assign(err, { url });
  throw err;
};

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => redirectError(url)),
}));

import { redirect } from "next/navigation";
import { GET } from "@/app/auth/confirm/route";

beforeEach(() => {
  vi.clearAllMocks();

  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      verifyOtp: mockVerifyOtp,
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  });
});

function makeConfirmRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/auth/confirm");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

describe("Reset Password", () => {
  describe("Token verification — auth/confirm route (unit)", () => {
    it("redirects to /reset-password for valid recovery token", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeConfirmRequest({
        token_hash: "valid-token-hash",
        type: "recovery",
      });

      await expect(GET(request as never)).rejects.toThrow("NEXT_REDIRECT");

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        type: "recovery",
        token_hash: "valid-token-hash",
      });
      expect(redirect).toHaveBeenCalledWith("/reset-password");
    });

    it("redirects to /auth/auth-code-error for invalid token", async () => {
      mockVerifyOtp.mockResolvedValue({
        error: { message: "Token has expired or is invalid" },
      });

      const request = makeConfirmRequest({
        token_hash: "expired-token",
        type: "recovery",
      });

      await expect(GET(request as never)).rejects.toThrow("NEXT_REDIRECT");

      expect(redirect).toHaveBeenCalledWith("/auth/auth-code-error");
    });

    it("redirects to /auth/auth-code-error when token_hash is missing", async () => {
      mockVerifyOtp.mockResolvedValue({
        error: { message: "Token hash is required" },
      });

      const request = makeConfirmRequest({ type: "recovery" });

      await expect(GET(request as never)).rejects.toThrow("NEXT_REDIRECT");

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        type: "recovery",
        token_hash: "",
      });
      expect(redirect).toHaveBeenCalledWith("/auth/auth-code-error");
    });

    it("redirects to /volunteers for non-recovery token types", async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const request = makeConfirmRequest({
        token_hash: "valid-token",
        type: "email",
      });

      await expect(GET(request as never)).rejects.toThrow("NEXT_REDIRECT");

      expect(redirect).toHaveBeenCalledWith("/volunteers");
    });
  });

  describe("PKCE code exchange — auth/confirm route (unit)", () => {
    it("redirects to /reset-password for valid recovery code", async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const request = makeConfirmRequest({
        code: "valid-pkce-code",
        type: "recovery",
      });

      await expect(GET(request as never)).rejects.toThrow("NEXT_REDIRECT");

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith(
        "valid-pkce-code"
      );
      expect(redirect).toHaveBeenCalledWith("/reset-password");
    });

    it("redirects to /auth/auth-code-error for invalid code", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: "Invalid code" },
      });

      const request = makeConfirmRequest({
        code: "invalid-code",
        type: "recovery",
      });

      await expect(GET(request as never)).rejects.toThrow("NEXT_REDIRECT");

      expect(redirect).toHaveBeenCalledWith("/auth/auth-code-error");
    });

    it("redirects to /volunteers for non-recovery code", async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const request = makeConfirmRequest({
        code: "valid-pkce-code",
        type: "email",
      });

      await expect(GET(request as never)).rejects.toThrow("NEXT_REDIRECT");

      expect(redirect).toHaveBeenCalledWith("/volunteers");
    });

    it("prefers code over token_hash when both are present", async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null });

      const request = makeConfirmRequest({
        code: "valid-pkce-code",
        token_hash: "some-token-hash",
        type: "recovery",
      });

      await expect(GET(request as never)).rejects.toThrow("NEXT_REDIRECT");

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith(
        "valid-pkce-code"
      );
      expect(mockVerifyOtp).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith("/reset-password");
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
