import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { PASSWORD_RESET_GATE_COOKIE } from "@/lib/auth/passwordResetGateConstants";

// Mock Supabase SSR before importing middleware
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: { claims: null } }),
    },
  })),
}));

import { updateSession } from "@/lib/client/supabase/middleware";

function makeRequest(
  url: string,
  cookieMap?: Record<string, string>
): NextRequest {
  const headers = new Headers();
  if (cookieMap && Object.keys(cookieMap).length > 0) {
    headers.set(
      "cookie",
      Object.entries(cookieMap)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ")
    );
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), { headers });
}

describe("middleware: code param redirect", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  });

  it("redirects /?code=xxx to /reset-password preserving params (PKCE recovery)", async () => {
    const req = makeRequest("http://localhost:3000/?code=abc123");
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    const locationUrl = new URL(location);
    expect(locationUrl.pathname).toBe("/reset-password");
    expect(locationUrl.searchParams.get("code")).toBe("abc123");
  });

  it("redirects / without code to /volunteers", async () => {
    const req = makeRequest("http://localhost:3000/");
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(new URL(location).pathname).toBe("/volunteers");
  });

  it("redirects /some-page?code=xyz to /login when path is not a PKCE salvage route", async () => {
    const req = makeRequest("http://localhost:3000/some-page?code=xyz");
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    const locationUrl = new URL(location);
    expect(locationUrl.pathname).toBe("/login");
    expect(locationUrl.searchParams.get("code")).toBe("xyz");
  });

  it("redirects bare /reset-password to forgot-password with hint", async () => {
    const req = makeRequest("http://localhost:3000/reset-password");
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    const locationUrl = new URL(res.headers.get("location")!);
    expect(locationUrl.pathname).toBe("/forgot-password");
    expect(locationUrl.searchParams.get("reset")).toBe("use-email-link");
  });

  it("allows /reset-password when PKCE code is present", async () => {
    const req = makeRequest("http://localhost:3000/reset-password?code=abc");
    const res = await updateSession(req);
    expect(res.status).not.toBe(307);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows /reset-password when gate cookie is set", async () => {
    const req = makeRequest("http://localhost:3000/reset-password", {
      [PASSWORD_RESET_GATE_COOKIE]: "1",
    });
    const res = await updateSession(req);
    expect(res.status).not.toBe(307);
    expect(res.headers.get("location")).toBeNull();
  });
});
