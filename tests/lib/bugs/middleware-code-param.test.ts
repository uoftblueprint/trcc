import { describe, it, expect, vi, beforeEach } from "vitest";

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
  url: string
): Request & { nextUrl: URL; cookies: { getAll: () => never[] } } {
  const parsed = new URL(url, "http://localhost:3000");
  return {
    nextUrl: Object.assign(parsed, {
      clone() {
        return new URL(parsed.toString());
      },
    }),
    cookies: { getAll: () => [] },
  } as never;
}

describe("middleware: code param redirect", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  });

  it("redirects /?code=xxx to /reset-password preserving params (PKCE recovery)", async () => {
    const req = makeRequest("http://localhost:3000/?code=abc123");
    const res = await updateSession(req as never);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    const locationUrl = new URL(location);
    expect(locationUrl.pathname).toBe("/reset-password");
    expect(locationUrl.searchParams.get("code")).toBe("abc123");
  });

  it("redirects / without code to /volunteers", async () => {
    const req = makeRequest("http://localhost:3000/");
    const res = await updateSession(req as never);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(new URL(location).pathname).toBe("/volunteers");
  });

  it("redirects /some-page?code=xyz to /login when path is not a PKCE salvage route", async () => {
    const req = makeRequest("http://localhost:3000/some-page?code=xyz");
    const res = await updateSession(req as never);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    const locationUrl = new URL(location);
    expect(locationUrl.pathname).toBe("/login");
    expect(locationUrl.searchParams.get("code")).toBe("xyz");
  });
});
