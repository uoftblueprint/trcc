import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/forgot-password/route";
import {
  createServiceTestClient,
  createAdminTestClient,
} from "../support/helpers";

//Unit test (mocking supabase)

vi.mock("@/lib/client/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/client/supabase/server";

const mockResetPasswordForEmail = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  });
});

describe("Forgot Password Route", () => {
  describe("Request validation (unit)", () => {
    it("returns 400 for invalid JSON", async () => {
      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: "invalid",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid JSON format" });
    });

    it("returns 400 for missing email", async () => {
      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid email address" });
    });

    it("returns 400 for non-string email", async () => {
      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: 123 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid email address" });
    });
  });

  describe("Supabase (unit)", () => {
    it("returns 200 and success message when Supabase succeeds", async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "admin@example.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: "Password reset email sent." });
    });

    it("calls resetPasswordForEmail with the correct email and redirectTo", async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });

      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "admin@example.com" }),
      });

      await POST(request);

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        "admin@example.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/update-password"),
        })
      );
    });

    it("returns 500 when Supabase returns an error", async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        error: { message: "User not found" },
      });

      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@example.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty("error");
    });

    it("returns 500 on unexpected server error", async () => {
      mockResetPasswordForEmail.mockRejectedValue(new Error("Network failure"));

      const request = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "admin@example.com" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Server error" });
    });
  });

  //  Integration Tests (real Supabase)

  describe("Forgot password + update password (integration)", () => {
    // adminClient: passes Bearer token — required for auth.admin.* calls
    // (createUser, deleteUser, updateUserById)
    const adminClient = createAdminTestClient();

    // regularClient: for resetPasswordForEmail and signInWithPassword which don't need admin privileges
    const regularClient = createServiceTestClient();

    describe("resetPasswordForEmail", () => {
      it("succeeds without error for an unknown email", async () => {
        const { error } = await regularClient.auth.resetPasswordForEmail(
          `test-unknown-${Date.now()}@example.com`,
          {
            redirectTo: `${process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000"}/update-password`,
          }
        );

        expect(error).toBeNull();
      });

      it("succeeds without error for a known user email", async () => {
        const testEmail = `test-reset-${Date.now()}@example.com`;

        const { data: created, error: createError } =
          await adminClient.auth.admin.createUser({
            email: testEmail,
            password: "InitialPassword123!",
            email_confirm: true,
          });

        expect(createError).toBeNull();
        const userId = created.user!.id;

        try {
          const { error: resetError } =
            await regularClient.auth.resetPasswordForEmail(testEmail, {
              redirectTo: `${process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000"}/update-password`,
            });

          expect(resetError).toBeNull();
        } finally {
          await adminClient.auth.admin.deleteUser(userId);
        }
      });
    });

    describe("updateUser (password change)", () => {
      it("successfully updates a user's password", async () => {
        const testEmail = `test-update-${Date.now()}@example.com`;
        const initialPassword = "InitialPassword123!";
        const newPassword = "UpdatedPassword456!";

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
        } finally {
          await adminClient.auth.admin.deleteUser(userId);
        }
      });

      it("new password works for sign-in after update", async () => {
        const testEmail = `test-signin-${Date.now()}@example.com`;
        const initialPassword = "InitialPassword123!";
        const newPassword = "UpdatedPassword456!";

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

      it("old password is rejected after update", async () => {
        const testEmail = `test-old-pw-${Date.now()}@example.com`;
        const initialPassword = "InitialPassword123!";
        const newPassword = "UpdatedPassword456!";

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
    });
  });
});
