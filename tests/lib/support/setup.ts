import dotenv from "dotenv";

// Load .env.test first (local Supabase keys), then fall back to .env for any missing vars
dotenv.config({ path: ".env.test" });
dotenv.config();

process.env["SUPABASE_TESTING"] = "1";
