import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/auth/forgot-password/route";

describe("Forgot Password Route", () => {
  describe("Request validation", () => {
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

  describe("Integration (real HTTP + real Supabase)", () => {
    it("calls real Supabase reset API successfully", async () => {
      const response = await fetch(
        "http://localhost:3000/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: `test-${Date.now()}@example.com`,
          }),
        }
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Password reset email sent.");
    });
  });
});
