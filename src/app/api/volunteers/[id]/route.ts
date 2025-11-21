// api route to patch a volunteer by id
import { NextRequest, NextResponse } from "next/server";
import {
  updateVolunteer,
  validateVolunteerUpdateBody,
} from "@/lib/api/updateVolunteer";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const volunteerId = Number.parseInt(id, 10);
  if (!Number.isSafeInteger(volunteerId) || volunteerId <= 0) {
    return NextResponse.json(
      { error: "Volunteer id must be a positive integer" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { updates, error: validationError } = validateVolunteerUpdateBody(body);
  if (validationError || !updates) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const { volunteer, error } = await updateVolunteer(volunteerId, updates);

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data: volunteer }, { status: 200 });
}
