import { NextRequest, NextResponse } from "next/server";
import { getVolunteersByRoles, isAllStrings, isValidOperator } from "@/lib/api/index";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const operator = searchParams.get("operator");
  const rolesParam = searchParams.get("roles");

  if (!operator || !rolesParam) {
    return NextResponse.json(
      { error: "Missing operator or filters" },
      { status: 400 }
    );
  }

  console.log(operator);
  const rolesArray = rolesParam.split(","); 
  console.log(rolesArray);
  if (!isAllStrings(rolesArray) || !isValidOperator(operator)) {
    return NextResponse.json(
      { error: "Malformed operator or filters" },
      { status: 400 }
    );
  }

  const response = await getVolunteersByRoles(operator as "OR" | "AND", rolesArray);

  return NextResponse.json(response, {
    status: response.status,
  });
}
