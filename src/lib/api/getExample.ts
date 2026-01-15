// Example API function to get data from Supabase
// You can follow a similar format
// Just remember to check for errors and edge cases in your functions

import { createClient } from "@/lib/client/supabase";

export async function getExample(
  word: string
): Promise<{ data: unknown; error: unknown }> {
  const client = await createClient();
  console.log("word ", word);
  const result = await client.from("Volunteers").select();
  console.log("data ", result);
  return result;
}
