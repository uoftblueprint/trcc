import dotenv from "dotenv";
import { vi } from "vitest";

// Load .env.test first (local Supabase keys), then fall back to .env for any missing vars
dotenv.config({ path: ".env.test" });
dotenv.config();

process.env["SUPABASE_TESTING"] = "1";

vi.mock("@/lib/api/getCurrentUserServer", () => ({
  getCurrentUserServer: vi.fn(async () => ({
    id: "00000000-0000-0000-0000-000000000001",
    role: "admin" as const,
    name: "Test Admin",
    created_at: new Date().toISOString(),
  })),
}));
