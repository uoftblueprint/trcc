import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";

type CohortRow = Database["public"]["Tables"]["Cohorts"]["Row"];

export async function getCohorts(): Promise<CohortRow[]> {
  // Initialize Supabase client
  const client = await createClient();

  const { data, error, status } = await client.from("Cohorts").select();

  // Log the response for debugging
  console.log("Supabase client response:", { error, data, status });

  // Handle any errors from the query
  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  // Return the fetched data as a list of VolunteerRow or an empty array if none
  return (data as CohortRow[]) || [];
}
