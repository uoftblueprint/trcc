// API function to create a new volunteer in the database
import { createClient } from "@/lib/client/supabase";
import type { Json, TablesInsert } from "@/lib/client/supabase/types";

// Valid role types
const VALID_ROLE_TYPES = ["prior", "current", "future_interest"] as const;
export type RoleType = (typeof VALID_ROLE_TYPES)[number];

// Valid cohort terms
const VALID_COHORT_TERMS = ["Fall", "Summer", "Winter", "Spring"] as const;
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

  // opt_in_communication (optional; when provided must be boolean)
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
 * Builds the volunteer JSON payload for the RPC (only allowed columns).
 */
function volunteerToJson(volunteer: VolunteerInput): Record<string, unknown> {
  return {
    name_org: volunteer.name_org,
    pseudonym: volunteer.pseudonym ?? null,
    pronouns: volunteer.pronouns ?? null,
    email: volunteer.email ?? null,
    phone: volunteer.phone ?? null,
    position: volunteer.position ?? null,
    opt_in_communication: volunteer.opt_in_communication ?? true,
    notes: volunteer.notes ?? null,
  };
}

/**
 * Creates a new volunteer in the database with associated role and cohort.
 * Runs in a single transaction: either all tables are updated or none.
 * If the role or cohort does not exist, it is created.
 *
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
    const client = await createClient();

    const { data: volunteerId, error } = await client.rpc(
      "create_volunteer_with_role_and_cohort",
      {
        p_volunteer: volunteerToJson(volunteer) as Json,
        p_role_name: role.name,
        p_role_type: role.type,
        p_cohort_year: cohort.year,
        p_cohort_term: cohort.term,
      }
    );

    if (error) {
      console.error("Database error while creating volunteer:", error);

      if (error.code === "23505") {
        return {
          success: false,
          error: "A volunteer with this information already exists",
          dbError: error,
        };
      }

      return {
        success: false,
        error: error.message ?? "Failed to create volunteer in database",
        dbError: error,
      };
    }

    if (volunteerId === null || volunteerId === undefined) {
      return {
        success: false,
        error: "Failed to retrieve volunteer ID after insertion",
      };
    }

    return {
      success: true,
      data: { id: Number(volunteerId) },
    };
  } catch (error) {
    console.error("Unexpected error while creating volunteer:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
