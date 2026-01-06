// Example API function to get data from Supabase
// You can follow a similar format
// Just remember to check for errors and edge cases in your functions
import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";

type VolunteerRow = Database["public"]["Tables"]["Volunteers"]["Row"];

export async function getExample(word: string): Promise<VolunteerRow[]> {
  // Initialize Supabase client
  const client = await createClient();
  console.log("word ", word);

  // Example query to select all data from "Volunteers" table
  const { data, error, status } = await client.from("Volunteers").select();

  // Log the response for debugging
  console.log("Supabase client response:", { error, data, status });

  // Handle any errors from the query
  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  // Return the fetched data as a list of VolunteerRow or an empty array if none
  return (data as VolunteerRow[]) || [];
}
