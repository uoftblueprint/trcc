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

// Volunteer payload (position is not collected in UI; DB stores null)
export type VolunteerInput = Omit<
  TablesInsert<"Volunteers">,
  "id" | "created_at" | "updated_at" | "position"
>;

export type CreateVolunteerInput = {
  volunteer: VolunteerInput;
  roles: RoleInput[];
  cohorts: CohortInput[];
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

function validateVolunteerData(
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

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

  if (data["email"] !== undefined && data["email"] !== null) {
    if (typeof data["email"] !== "string") {
      errors.push({
        field: "volunteer.email",
        message: "Email must be a string",
      });
    }
  }

  if (data["phone"] !== undefined && data["phone"] !== null) {
    if (typeof data["phone"] !== "string") {
      errors.push({
        field: "volunteer.phone",
        message: "Phone must be a string",
      });
    }
  }

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

  const optionalStringFields = ["pronouns", "pseudonym", "notes"] as const;
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

  if (data["custom_data"] !== undefined && data["custom_data"] !== null) {
    if (
      typeof data["custom_data"] !== "object" ||
      Array.isArray(data["custom_data"])
    ) {
      errors.push({
        field: "volunteer.custom_data",
        message: "custom_data must be a plain object",
      });
    }
  }

  return errors;
}

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

function validateRolesArray(roles: unknown): ValidationError[] {
  if (!Array.isArray(roles)) {
    return [{ field: "roles", message: "roles must be an array" }];
  }
  const errors: ValidationError[] = [];
  roles.forEach((r, i) => {
    for (const e of validateRoleInput(r)) {
      errors.push({
        field: e.field.replace(/^role/, `roles[${i}]`),
        message: e.message,
      });
    }
  });
  return errors;
}

function validateCohortsArray(cohorts: unknown): ValidationError[] {
  if (!Array.isArray(cohorts)) {
    return [{ field: "cohorts", message: "cohorts must be an array" }];
  }
  const errors: ValidationError[] = [];
  cohorts.forEach((c, i) => {
    for (const e of validateCohortInput(c)) {
      errors.push({
        field: e.field.replace(/^cohort/, `cohorts[${i}]`),
        message: e.message,
      });
    }
  });
  return errors;
}

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

  errors.push(...validateRolesArray(data["roles"]));
  errors.push(...validateCohortsArray(data["cohorts"]));

  return errors;
}

function volunteerToJson(volunteer: VolunteerInput): Record<string, unknown> {
  const row: Record<string, unknown> = {
    name_org: volunteer.name_org,
    pseudonym: volunteer.pseudonym ?? null,
    pronouns: volunteer.pronouns ?? null,
    email: volunteer.email ?? null,
    phone: volunteer.phone ?? null,
    opt_in_communication: volunteer.opt_in_communication ?? true,
    notes: volunteer.notes ?? null,
  };
  const cd = volunteer.custom_data;
  if (
    cd !== undefined &&
    cd !== null &&
    typeof cd === "object" &&
    !Array.isArray(cd)
  ) {
    row["custom_data"] = cd;
  }
  return row;
}

/**
 * Creates a volunteer with optional many roles and cohorts in one DB transaction.
 */
export async function createVolunteer(
  input: CreateVolunteerInput
): Promise<CreateVolunteerResponse> {
  try {
    const validationErrors = validateInput(input);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: "Validation failed",
        validationErrors,
      };
    }

    const { volunteer, roles, cohorts } = input;
    const client = await createClient();

    const { data: volunteerId, error } = await client.rpc(
      "create_volunteer_with_roles_and_cohorts",
      {
        p_volunteer: volunteerToJson(volunteer) as Json,
        p_roles: roles as unknown as Json,
        p_cohorts: cohorts as unknown as Json,
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
