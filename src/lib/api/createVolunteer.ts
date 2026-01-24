// API function to create a new volunteer in the database
import { createClient } from "../client/supabase/server";
import type { TablesInsert } from "../client/supabase/types";

// Valid role types
const VALID_ROLE_TYPES = ["prior", "current", "future_interest"] as const;
export type RoleType = (typeof VALID_ROLE_TYPES)[number];

// Valid cohort terms
const VALID_COHORT_TERMS = ["fall", "summer", "winter", "spring"] as const;
export type CohortTerm = (typeof VALID_COHORT_TERMS)[number];

// Role input type
export type RoleInput = {
  name: string;
  type: RoleType;
};

// Cohort input type
export type CohortInput = {
  year: number;
  term: CohortTerm;
};

// Type for the volunteer data we expect to receive
export type VolunteerInput = Omit<
  TablesInsert<"Volunteers">,
  "id" | "created_at" | "updated_at"
>;

// Combined input type for creating a volunteer with role and cohort
export type CreateVolunteerInput = {
  volunteer: VolunteerInput;
  role: RoleInput;
  cohort: CohortInput;
};

// Validation error type
export type ValidationError = {
  field: string;
  message: string;
};

// Response type for the API function
export type CreateVolunteerResponse =
  | { success: true; data: { id: number } }
  | {
      success: false;
      error: string;
      validationErrors?: ValidationError[];
      dbError?: unknown;
    };

/**
 * Validates volunteer input data
 * @param data - The volunteer data to validate
 * @returns An array of validation errors (empty if valid)
 */
function validateVolunteerData(
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // name_org
  if (!data["name_org"] || typeof data["name_org"] !== "string") {
    errors.push({
      field: "volunteer.name_org",
      message: "Name/Organization is required and must be a string",
    });
  } else if ((data["name_org"] as string).trim().length === 0) {
    errors.push({
      field: "volunteer.name_org",
      message: "Name/Organization cannot be empty",
    });
  }

  // email
  if (data["email"] !== undefined && data["email"] !== null) {
    if (typeof data["email"] !== "string") {
      errors.push({
        field: "volunteer.email",
        message: "Email must be a string",
      });
    } else if (
      (data["email"] as string).trim().length > 0 &&
      !isValidEmail(data["email"] as string)
    ) {
      errors.push({
        field: "volunteer.email",
        message: "Email must be a valid email address",
      });
    }
  }

  // phone
  if (data["phone"] !== undefined && data["phone"] !== null) {
    if (typeof data["phone"] !== "string") {
      errors.push({
        field: "volunteer.phone",
        message: "Phone must be a string",
      });
    }
  }

  // opt_in_communication
  if (
    data["opt_in_communication"] !== undefined &&
    data["opt_in_communication"] !== null
  ) {
    if (typeof data["opt_in_communication"] !== "boolean") {
      errors.push({
        field: "volunteer.opt_in_communication",
        message: "opt_in_communication must be a boolean",
      });
    }
  }

  // optional string fields
  const optionalStringFields = [
    "position",
    "pronouns",
    "pseudonym",
    "notes",
  ] as const;
  for (const field of optionalStringFields) {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== "string") {
        errors.push({
          field: `volunteer.${field}`,
          message: `${field} must be a string`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validates role input data
 * @param role - The role data to validate
 * @returns An array of validation errors (empty if valid)
 */
function validateRoleInput(role: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!role || typeof role !== "object") {
    errors.push({
      field: "role",
      message: "Role is required and must be an object",
    });
    return errors;
  }

  const roleData = role as Record<string, unknown>;

  // name
  if (!roleData["name"] || typeof roleData["name"] !== "string") {
    errors.push({
      field: "role.name",
      message: "Role name is required and must be a string",
    });
  } else if ((roleData["name"] as string).trim().length === 0) {
    errors.push({
      field: "role.name",
      message: "Role name cannot be empty",
    });
  }

  // type
  if (!roleData["type"] || typeof roleData["type"] !== "string") {
    errors.push({
      field: "role.type",
      message: "Role type is required and must be a string",
    });
  } else if (
    !VALID_ROLE_TYPES.includes(
      roleData["type"] as (typeof VALID_ROLE_TYPES)[number]
    )
  ) {
    errors.push({
      field: "role.type",
      message: `Role type must be one of: ${VALID_ROLE_TYPES.join(", ")}`,
    });
  }

  return errors;
}

/**
 * Validates cohort input data
 * @param cohort - The cohort data to validate
 * @returns An array of validation errors (empty if valid)
 */
function validateCohortInput(cohort: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!cohort || typeof cohort !== "object") {
    errors.push({
      field: "cohort",
      message: "Cohort is required and must be an object",
    });
    return errors;
  }

  const cohortData = cohort as Record<string, unknown>;

  // year
  if (cohortData["year"] === undefined || cohortData["year"] === null) {
    errors.push({
      field: "cohort.year",
      message: "Cohort year is required",
    });
  } else if (
    typeof cohortData["year"] !== "number" ||
    !Number.isInteger(cohortData["year"])
  ) {
    errors.push({
      field: "cohort.year",
      message: "Cohort year must be an integer",
    });
  }

  // term
  if (!cohortData["term"] || typeof cohortData["term"] !== "string") {
    errors.push({
      field: "cohort.term",
      message: "Cohort term is required and must be a string",
    });
  } else if (
    !VALID_COHORT_TERMS.includes(
      cohortData["term"] as (typeof VALID_COHORT_TERMS)[number]
    )
  ) {
    errors.push({
      field: "cohort.term",
      message: `Cohort term must be one of: ${VALID_COHORT_TERMS.join(", ")}`,
    });
  }

  return errors;
}

/**
 * Validates the complete input for creating a volunteer
 * @param input - The input data to validate
 * @returns An array of validation errors (empty if valid)
 */
function validateInput(input: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== "object") {
    errors.push({
      field: "general",
      message: "Request body must be a valid JSON object",
    });
    return errors;
  }

  const data = input as Record<string, unknown>;

  // Validate volunteer data
  if (!data["volunteer"] || typeof data["volunteer"] !== "object") {
    errors.push({
      field: "volunteer",
      message: "Volunteer data is required and must be an object",
    });
  } else {
    errors.push(
      ...validateVolunteerData(data["volunteer"] as Record<string, unknown>)
    );
  }

  // Validate role
  errors.push(...validateRoleInput(data["role"]));

  // Validate cohort
  errors.push(...validateCohortInput(data["cohort"]));

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
 * Creates a new volunteer in the database with associated role and cohort
 * @param input - The volunteer, role, and cohort data to insert
 * @returns A response object indicating success or failure
 */
export async function createVolunteer(
  input: CreateVolunteerInput
): Promise<CreateVolunteerResponse> {
  try {
    // Validate input
    const validationErrors = validateInput(input);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: "Validation failed",
        validationErrors,
      };
    }

    const { volunteer, role, cohort } = input;

    // Create Supabase client
    const client = await createClient();

    // Verify role exists in the Roles table
    const { data: roleData, error: roleError } = await client
      .from("Roles")
      .select("id")
      .eq("name", role.name)
      .eq("type", role.type)
      .single();

    if (roleError || !roleData) {
      return {
        success: false,
        error: `Role not found: ${role.name} (${role.type})`,
        dbError: roleError,
      };
    }

    // Verify cohort exists in the Cohorts table
    const { data: cohortData, error: cohortError } = await client
      .from("Cohorts")
      .select("id")
      .eq("year", cohort.year)
      .eq("term", cohort.term)
      .single();

    if (cohortError || !cohortData) {
      return {
        success: false,
        error: `Cohort not found: ${cohort.term} ${cohort.year}`,
        dbError: cohortError,
      };
    }

    // Insert volunteer into database
    const { data: volunteerResult, error: volunteerError } = await client
      .from("Volunteers")
      .insert(volunteer)
      .select("id")
      .single();

    if (volunteerError) {
      console.error("Database error while creating volunteer:", volunteerError);

      if (volunteerError.code === "23505") {
        return {
          success: false,
          error: "A volunteer with this information already exists",
          dbError: volunteerError,
        };
      }

      return {
        success: false,
        error: "Failed to create volunteer in database",
        dbError: volunteerError,
      };
    }

    if (!volunteerResult || !volunteerResult.id) {
      return {
        success: false,
        error: "Failed to retrieve volunteer ID after insertion",
      };
    }

    const volunteerId = volunteerResult.id;

    // Create VolunteerRoles relation
    const { error: volunteerRoleError } = await client
      .from("VolunteerRoles")
      .insert({
        volunteer_id: volunteerId,
        role_id: roleData.id,
      });

    if (volunteerRoleError) {
      console.error(
        "Database error while creating volunteer role:",
        volunteerRoleError
      );
      return {
        success: false,
        error: "Failed to create volunteer role relation",
        dbError: volunteerRoleError,
      };
    }

    // Create VolunteerCohorts relation
    const { error: volunteerCohortError } = await client
      .from("VolunteerCohorts")
      .insert({
        volunteer_id: volunteerId,
        cohort_id: cohortData.id,
      });

    if (volunteerCohortError) {
      console.error(
        "Database error while creating volunteer cohort:",
        volunteerCohortError
      );
      return {
        success: false,
        error: "Failed to create volunteer cohort relation",
        dbError: volunteerCohortError,
      };
    }

    // Return success response
    return {
      success: true,
      data: { id: volunteerId },
    };
  } catch (error) {
    console.error("Unexpected error while creating volunteer:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
