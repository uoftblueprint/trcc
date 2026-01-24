import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";
type Cohort = Database["public"]["Tables"]["Cohorts"]["Row"];

const cohortTypeMap: Record<keyof Cohort, "string" | "number" | "boolean"> = {
  year: "number",
  term: "string",
  is_active: "boolean",
  created_at: "string",
  id: "number",
};

export async function addCohort(data: unknown): Promise<Cohort[]> {
  //validate the data input first

  if (typeof data !== "object" || data === null) {
    throw new Error("Data must be an object");
  }

  for (const key in cohortTypeMap) {
    const expectedType = cohortTypeMap[key as keyof Cohort];
    const value = (data as Record<string, unknown>)[key];

    if (value === undefined || value === null) {
      throw new Error(`Field '${key}' is required`);
    }

    if (typeof value !== expectedType) {
      throw new Error(`Field '${key}' must be a ${expectedType}`);
    }
  }

  //create the supabase client
  const supabase = await createClient();

  const { data: insertedData, error } = await supabase
    .from("Cohorts")
    .insert([data])
    .select();
  if (error) throw new Error(`Supabase insert error: ${error.message}`);

  return insertedData;
}
