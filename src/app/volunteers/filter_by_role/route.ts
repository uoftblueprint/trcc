import { NextRequest } from "next/server";
import { getRolesByFilter } from "@/lib/api/index";

export async function GET(request: NextRequest) {
  

  const response = await getRolesByFilter("OR", ["Role 1"]);

  if (response.status == 200) {
    return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  } else {
    return new Response(JSON.stringify(response), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
  }
}
