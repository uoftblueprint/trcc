import { NextRequest, NextResponse } from "next/server";
import {
  getVolunteersByRoles,
  isAllStrings,
  isValidOperator,
} from "@/lib/client/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const operator = searchParams.get("operator");
  const roleParams = searchParams.get("roles");

  if (!operator || !roleParams) {
    return NextResponse.json({
      status: 400,
      error: "Missing operator or role filter values",
    });
  }

  const roles = roleParams.split(",");

  if (!isValidOperator(operator)) {
    return { status: 400, error: "Operator is not AND or OR" };
  }

  if (!isAllStrings(roles)) {
    return {
      status: 400,
      error: "Roles to filter by are not all strings",
    };
  }

  const response = await getVolunteersByRoles(operator as "OR" | "AND", roles);

  return NextResponse.json(response, {
    status: response.status,
  });
}
