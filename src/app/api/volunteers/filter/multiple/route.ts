import { NextRequest, NextResponse } from "next/server";
import {
  filterMultipleColumns,
  validateFilter
} from "@/lib/api/filterMultipleColumns";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filtersListParameter = searchParams.get("filters_list");
    const op = searchParams.get("op");

    if (!filtersListParameter || !op)
      return NextResponse.json({ error: "Missing parameter" }, { status: 400 });

    let filters;
    try {
      filters = JSON.parse(filtersListParameter);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON for 'filters_list' parameter" },
        { status: 400 }
      );
    }

    const validation = validateFilter(filters, op);
    if (!validation.valid)
      return NextResponse.json({ error: validation.error }, { status: 400 });

    const { data, error } = await filterMultipleColumns(filters, op);

    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
