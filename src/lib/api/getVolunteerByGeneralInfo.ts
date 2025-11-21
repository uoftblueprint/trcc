import { createClient } from "../client/supabase/server";
import type { Database } from "@/lib/client/supabase/types";

type LogicalOp = "AND" | "OR";

type VolunteerRow = Database["public"]["Tables"]["Volunteers"]["Row"];

export async function getVolunteerByGeneralInfo(
  op: LogicalOp,
  column: keyof VolunteerRow & string,
  values: string[]
): Promise<{
  data: VolunteerRow[] | null;
  error: Error | null;
}> {
  if (values.length === 0) {
    return { data: null, error: new Error("No values provided.") };
  }

  const client = await createClient();

  if (op === "AND") {
    const uniqueValues = [...new Set(values)];

    if (uniqueValues.length > 1) {
      return { data: [], error: null }; // Return empty result if there are multiple unique values
    }
    const value = uniqueValues[0]!;

    const { data, error } = await client
      .from("Volunteers")
      .select()
      .eq(column, value);

    return {
      data,
      error: error ?? null,
    };
  }
  if (op === "OR") {
    const { data, error } = await client
      .from("Volunteers")
      .select()
      .in(column, values);

    return {
      data,
      error: error ?? null,
    };
  }
  return {
    data: null,
    error: new Error(`Unsupported operator: ${op}`),
  };
}
