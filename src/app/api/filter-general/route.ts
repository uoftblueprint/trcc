import { filter_general } from "@/lib/api/filter_general";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const op = searchParams.get("op");
  const column = searchParams.get("column");
  const values = searchParams.getAll("values");

  if (!op || !column || values.length == 0) {
    return Response.json(
      { data: null, error: "Missing op, column, or values." },
      { status: 400 }
    );
  }

  const result = await filter_general(op, column, values);

  if (result.error) {
    return Response.json(result, { status: 400 });
  }

  return Response.json(result, { status: 200 });
}
