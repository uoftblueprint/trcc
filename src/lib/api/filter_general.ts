import { createClient } from "../client/supabase/server";

export async function filter_general(
  op: string,
  column: string,
  values: string[]
) {
  const valid_columns = [
    "name_org",
    "pseudonym",
    "pronouns",
    "email",
    "phone",
    "position",
    "opt_in_communication",
  ];

  if (!valid_columns.includes(column)) {
    return { data: null, error: "Invalid column name" };
  }

  const client = await createClient();

  if (values.length == 0) {
    return { data: null, error: "No values provided." };
  }

  if (op == "AND") {
    const uniqueValues = [...new Set(values)];

    if (uniqueValues.length > 1) {
      return { data: [], error: null }; // Return empty result if there are multiple unique values
    }

    const value = uniqueValues[0];

    const result = await client.from("Volunteers").select().eq(column, value);
    return result;
  }
  if (op == "OR") {
    const result = await client.from("Volunteers").select().in(column, values);
    return result;
  }
  return { data: null, error: "Invalid operation." };
}
