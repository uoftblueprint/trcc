// Example API function to get data from Supabase
// You can follow a similar format
// Just remember to check for errors and edge cases in your functions

import { createClient } from "../client/supabase/server";

export async function getExample(word: string) {
  const client = await createClient();
  console.log("word ", word);
  const result = await client.from("Volunteers").select();
  console.log("data ", result);
  return result;
}

function returnsNumber(): number {
  return 67;
}

function takesString(s: string): void {
  console.log(s);
}

takesString(returnsNumber());
