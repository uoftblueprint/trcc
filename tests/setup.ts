// Test setup for Vitest
// Set environment variables for local Supabase
// This file is loaded by Vitest before running tests.

// Point tests at a local Supabase instance
// Default to the local Supabase API port (configured in `supabase/config.toml`)
process.env["NEXT_PUBLIC_SUPABASE_URL"] =
  process.env["NEXT_PUBLIC_SUPABASE_URL"] || "http://127.0.0.1:54321";
process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] =
  process.env["NEXT_PUBLIC_SUPABASE_LOCAL_PUBLISHABLE_KEY"];
process.env["SUPABASE_TESTING"] = "1";
process.env["SUPABASE_SERVICE_ROLE_KEY"] =
  process.env["SUPABASE_SERVICE_ROLE_KEY"];
