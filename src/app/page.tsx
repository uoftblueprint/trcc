import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: example } = await supabase.from("example").select();

  return <pre>{JSON.stringify(example, null, 2)}</pre>;
}
