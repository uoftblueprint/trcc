import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";

type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];

type type = "prior" | "current" | "future_interest";

export async function createRole(
  name: string,
  type: type,
  is_active: boolean = true
): Promise<RoleRow> {
    // Check inputs
    if (!name || !type) {
      throw new Error("Name and type are required to create a role.");
    }
    // Other checks already handled by Supabase constraints and TypeScript types

    // Initialize Supabase client
    const client = await createClient();
    console.log("Created Supabase client for createRole.");

    // Insert a new role into the "Roles" table
    const { data, error, status } = await client
      .from("Roles")
      .insert([{ name, type, is_active }])
      .select()
      .single();
    
    // Check for Supabase errors
    if (error) {
        console.error("Error creating role: ", error, "Status: ", status);
        throw new Error(error.message || JSON.stringify(error));
    }

    // Ensure data is returned
    if (!data) {
        throw new Error("No data returned after creating role. Status: " + status);
    }

    console.log("Role created successfully: ", data);
    return data as RoleRow;
}
