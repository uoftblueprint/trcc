import { getExample } from "@/lib/api/index";

export default async function Home() {
  const example = await getExample("test");

  return <pre>{JSON.stringify(example, null, 2)}</pre>;
}
