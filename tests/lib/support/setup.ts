import dotenv from "dotenv";

// Automatically find the .env file
dotenv.config();

process.env["SUPABASE_TESTING"] = "1";
