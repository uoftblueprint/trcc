// API function to create a new volunteer in the database
import { createClient } from "../client/supabase/server";
import type { TablesInsert } from "../client/supabase/types";

// Type for the volunteer data we expect to receive
export type VolunteerInput = Omit<
  TablesInsert<"Volunteers">,
  "id" | "created_at" | "updated_at"
>;

// Validation error type
export type ValidationError = {
  field: string;
  message: string;
};

// Response type for the API function
export type CreateVolunteerResponse =
  | { success: true; data: { id: number } }
  | { success: false; error: string; validationErrors?: ValidationError[] };

/**
 * Validates volunteer input data
 * @param data - The volunteer data to validate
 * @returns An array of validation errors (empty if valid)
 */
function validateVolunteerInput(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object") {
    errors.push({
      field: "general",
      message: "Request body must be a valid JSON object",
    });
    return errors;
  }

  const volunteer = data as Record<string, unknown>;

  // name_org
  if (!volunteer.name_org || typeof volunteer.name_org !== "string") {
    errors.push({
      field: "name_org",
      message: "Name/Organization is required and must be a string",
    });
  } else if (volunteer.name_org.trim().length === 0) {
    errors.push({
      field: "name_org",
      message: "Name/Organization cannot be empty",
    });
  }

  // email
  if (volunteer.email !== undefined && volunteer.email !== null) {
    if (typeof volunteer.email !== "string") {
      errors.push({
        field: "email",
        message: "Email must be a string",
      });
    } else if (
      volunteer.email.trim().length > 0 &&
      !isValidEmail(volunteer.email)
    ) {
      errors.push({
        field: "email",
        message: "Email must be a valid email address",
      });
    }
  }

  // phone
  if (volunteer.phone !== undefined && volunteer.phone !== null) {
    if (typeof volunteer.phone !== "string") {
      errors.push({
        field: "phone",
        message: "Phone must be a string",
      });
    }
  }

  // opt_in_communication
  if (
    volunteer.opt_in_communication !== undefined &&
    volunteer.opt_in_communication !== null
  ) {
    if (typeof volunteer.opt_in_communication !== "boolean") {
      errors.push({
        field: "opt_in_communication",
        message: "opt_in_communication must be a boolean",
      });
    }
  }

  // optional_string_fields
  const optionalStringFields = [
    "position",
    "pronouns",
    "pseudonym",
    "notes",
  ] as const;
  for (const field of optionalStringFields) {
    if (volunteer[field] !== undefined && volunteer[field] !== null) {
      if (typeof volunteer[field] !== "string") {
        errors.push({
          field,
          message: `${field} must be a string`,
        });
      }
    }
  }

  return errors;
}

/**
 * Simple email validation using regex
 * @param email - The email to validate
 * @returns true if the email is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Creates a new volunteer in the database
 * @param volunteerData - The volunteer data to insert
 * @returns A response object indicating success or failure
 */
export async function createVolunteer(
  volunteerData: unknown
): Promise<CreateVolunteerResponse> {
  try {
    // Validate input
    const validationErrors = validateVolunteerInput(volunteerData);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: "Validation failed",
        validationErrors,
      };
    }

    // Create Supabase client
    const client = await createClient();

    // Insert volunteer into database
    const { data, error } = await client
      .from("Volunteers")
      .insert(volunteerData as VolunteerInput)
      .select("id")
      .single();

    // Handle database errors
    if (error) {
      console.error("Database error while creating volunteer:", error);

      // Check for common database errors
      if (error.code === "23505") {
        // Unique constraint violation
        return {
          success: false,
          error: "A volunteer with this information already exists",
        };
      }

      return {
        success: false,
        error: "Failed to create volunteer in database",
      };
    }

    // Check if data was returned
    if (!data || !data.id) {
      return {
        success: false,
        error: "Failed to retrieve volunteer ID after insertion",
      };
    }

    // Return success response
    return {
      success: true,
      data: { id: data.id },
    };
  } catch (error) {
    console.error("Unexpected error while creating volunteer:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
