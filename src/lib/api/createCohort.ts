"use server";

import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";

type Cohort = Database["public"]["Tables"]["Cohorts"]["Row"];
export type CohortInsert = Database["public"]["Tables"]["Cohorts"]["Insert"];

const VALID_TERMS = ["Fall", "Spring", "Summer", "Winter"] as const;

export async function createCohort(data: unknown): Promise<Cohort[]> {
  if (typeof data !== "object" || data === null) {
    throw new Error("Data must be an object");
  }

  const record = data as Record<string, unknown>;

  if (record["term"] === undefined) {
    throw new Error("Field 'term' is required");
  }
  if (record["year"] === undefined) {
    throw new Error("Field 'year' is required");
  }
  if (record["is_active"] === undefined) {
    throw new Error("Field 'is_active' is required");
  }

  if (typeof record["term"] !== "string") {
    throw new Error("Field 'term' must be a string");
  }
  if (typeof record["year"] !== "number") {
    throw new Error("Field 'year' must be a number");
  }
  if (typeof record["is_active"] !== "boolean") {
    throw new Error("Field 'is_active' must be a boolean");
  }

  if (!VALID_TERMS.includes(record["term"] as (typeof VALID_TERMS)[number])) {
    throw new Error(`Field 'term' must be one of: ${VALID_TERMS.join(", ")}`);
  }

  const insertData: CohortInsert = {
    term: record["term"] as string,
    year: record["year"] as number,
    is_active: record["is_active"] as boolean,
  };

  const supabase = await createClient();

  const { data: insertedData, error } = await supabase
    .from("Cohorts")
    .insert(insertData)
    .select();

  if (error) throw new Error(`Supabase insert error: ${error.message}`);

  return insertedData;
}
