import { getExample } from "@/lib/api";

export default async function Home(): Promise<React.JSX.Element> {
  const example = await getExample("test");

  return <pre>{JSON.stringify(example, null, 2)}</pre>;
}
