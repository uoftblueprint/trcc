import { NextRequest, NextResponse } from "next/server";
import { addVolunteer } from "@/lib/api/addVolunteer";

/**
 * POST /api/volunteers
 * Adds a new volunteer to the database
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body",
        },
        { status: 400 },
      );
    }

    // Call the API function to add volunteer
    const result = await addVolunteer(body);

    // Handle validation errors
    if (!result.success) {
      const statusCode = result.validationErrors ? 400 : 500;
      return NextResponse.json(result, { status: statusCode });
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Volunteer added successfully",
        data: result.data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/volunteers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 },
    );
  }
}
