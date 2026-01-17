import { createClient } from "../client/supabase/server";
import type { VolunteerGeneralInfoColumn } from "../api/volunteer-general-info";

type LogicalOp = "AND" | "OR";
type FilterByGeneralInfoResult = {
  data: unknown[] | null;
  error: string | null;
};

export async function filter_by_general_info(
  op: LogicalOp,
  column: VolunteerGeneralInfoColumn,
  values: string[]
): Promise<FilterByGeneralInfoResult> {
  if (values.length === 0) {
    return { data: null, error: "No values provided." };
  }

  const client = await createClient();

  if (op === "AND") {
    const uniqueValues = [...new Set(values)];

    if (uniqueValues.length > 1) {
      return { data: [], error: null }; // Return empty result if there are multiple unique values
    }
    const value = uniqueValues[0];

    return client.from("Volunteers").select().eq(column, value);
  }
  if (op === "OR") {
    const result = await client.from("Volunteers").select().in(column, values);
    return result;
  }
  return { data: null, error: "Invalid operation." };
}
