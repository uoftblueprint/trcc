import { createClient } from "../client/supabase/server";

export async function deleteVolunteer(id: number) {
  // Validate input
  if (typeof id !== "number" || id <= 0 || !Number.isInteger(id)) {
    return {
      error: {
        message: "Invalid volunteer ID. ID must be a positive integer.",
        status: 400,
      },
      data: null,
    };
  }

  try {
    const client = await createClient();

    // Check if volunteer exists before deleting
    const { data: existingVolunteer, error: fetchError } = await client
      .from("Volunteers")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingVolunteer) {
      return {
        error: {
          message: "Volunteer not found.",
          status: 404,
        },
        data: null,
      };
    }

    // Delete the volunteer
    const { error: deleteError } = await client
      .from("Volunteers")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return {
        error: {
          message: deleteError.message || "Failed to delete volunteer.",
          status: 500,
        },
        data: null,
      };
    }

    return {
      error: null,
      data: {
        message: "Volunteer deleted successfully.",
        id,
      },
      status: 200,
    };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
        status: 500,
      },
      data: null,
    };
  }
}
