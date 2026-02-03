import { createClient } from "../client/supabase/server";

interface RemoveVolunteerResponse {
  error: { message: string } | null;
  data: { message: string; id: number } | null;
  status: number;
}

/**
 * Removes a volunteer from the database by its numeric identifier.
 *
 * This function validates the provided `id`, attempts to remove the volunteer
 * record from the `Volunteers` table, and returns a structured response
 * indicating success or failure. On success, the response includes a
 * confirmation message and the removed volunteer's ID. On failure, it
 * provides an appropriate HTTP-like status code and error message.
 *
 * Validation:
 * - The `id` must be a positive integer.
 *
 * Possible outcomes:
 * - `400` if the provided `id` is invalid.
 * - `404` if no volunteer exists with the specified `id`.
 * - `500` if a database or unexpected error occurs.
 * - `200` when the volunteer is successfully removed.
 *
 * @param {number} id - The unique numeric identifier of the volunteer to remove.
 * @returns {Promise<RemoveVolunteerResponse>} A promise that resolves to an object containing:
 * - `status`: HTTP-like status code (`200`, `400`, `404`, or `500`).
 * - `data`: On success (`status === 200`), an object with a confirmation
 *   message and the removed volunteer's `id`; otherwise `null`.
 * - `error`: On failure, an object with an explanatory `message`; otherwise `null`.
 *
 * @example
 * const response = await removeVolunteer(123);
 * if (response.status === 200) {
 *   console.log(response.data?.message); // "Volunteer removed successfully."
 * } else {
 *   console.error(response.error?.message);
 * }
 */
export async function removeVolunteer(
  id: number
): Promise<RemoveVolunteerResponse> {
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
          message: deleteError.message || "Failed to remove volunteer.",
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
        message: "Volunteer removed successfully.",
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
