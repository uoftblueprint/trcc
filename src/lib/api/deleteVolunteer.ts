import { createClient } from "../client/supabase/server";

export async function deleteVolunteer(id: number) {
  // Validate input
  if (typeof id !== "number" || id <= 0 || !Number.isInteger(id)) {
    return {
      error: {
        message: "Invalid volunteer ID. ID must be a positive integer.",
      },
      data: null,
      status: 400,
    };
  }

  try {
    const client = await createClient();

    // Attempt to delete the volunteer and return the deleted id
    const { data: deletedVolunteer, error: deleteError } = await client
      .from("Volunteers")
      .delete()
      .eq("id", id)
      .select("id");

    if (deleteError) {
      return {
        error: {
          message: deleteError.message || "Failed to delete volunteer.",
        },
        data: null,
        status: 500,
      };
    }

    // If no volunteer was deleted, it did not exist
    if (!deletedVolunteer || deletedVolunteer.length === 0) {
      return {
        error: {
          message: "Volunteer not found.",
        },
        data: null,
        status: 404,
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
      },
      data: null,
      status: 500,
    };
  }
}
