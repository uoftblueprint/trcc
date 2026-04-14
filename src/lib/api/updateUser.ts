import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUserServer } from "@/lib/api/getCurrentUserServer";
import { createAdminClient } from "../client/supabase/server";
import type { Database } from "../client/supabase/types";

const ALLOWED_USER_ROLES = ["admin", "staff"];

type UserPatch = {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
};

export type ValidationError = {
  field: string;
  message: string;
};

type UpdateUserResponse =
  | { data: UserPatch; error?: never }
  | { data?: never; error: string; validationErrors?: ValidationError[] };

const ALLOWED_FIELDS = new Set<keyof UserPatch>([
  "name",
  "email",
  "password",
  "role",
]);

function validateUserUpdateBody(body: unknown): {
  cleanedPatch?: UserPatch;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      errors: [{ field: "body", message: "Body must be an object" }],
    };
  }

  const keys = Object.keys(body);

  if (keys.length === 0) {
    return {
      errors: [{ field: "body", message: "At least one field is required" }],
    };
  }

  for (const key of keys) {
    if (!ALLOWED_FIELDS.has(key as keyof UserPatch)) {
      errors.push({ field: key, message: "Field is not allowed" });
    }
  }

  const cleanedPatch: UserPatch = {};

  if ("name" in body) {
    if (typeof body["name"] !== "string") {
      errors.push({ field: "name", message: "Name must be a string" });
    } else if (!body["name"].trim()) {
      errors.push({ field: "name", message: "Name cannot be empty" });
    } else {
      cleanedPatch.name = body["name"].trim();
    }
  }

  if ("email" in body) {
    if (typeof body["email"] !== "string") {
      errors.push({ field: "email", message: "Email must be a string" });
    } else if (!body["email"].trim()) {
      errors.push({ field: "email", message: "Email cannot be empty" });
    } else {
      cleanedPatch.email = body["email"].trim();
    }
  }

  if ("password" in body) {
    if (typeof body["password"] !== "string") {
      errors.push({ field: "password", message: "Password must be a string" });
    } else if (body["password"].length < 6) {
      errors.push({
        field: "password",
        message: "Password must be at least 6 characters",
      });
    } else {
      cleanedPatch.password = body["password"];
    }
  }

  if ("role" in body) {
    if (typeof body["role"] !== "string") {
      errors.push({ field: "role", message: "Role must be a string" });
    } else {
      const trimmedRole = body["role"].trim();
      if (!trimmedRole) {
        cleanedPatch.role = "";
      } else if (!ALLOWED_USER_ROLES.includes(trimmedRole)) {
        errors.push({ field: "role", message: "Role invalid" });
      } else {
        cleanedPatch.role = trimmedRole;
      }
    }
  }

  return { cleanedPatch, errors };
}

/**
 * Updates a user in the database.
 * @param _userId - The ID of the user to update.
 * @param body - The body of the request.
 * @param body.name - The name of the user.
 * @param body.email - The email of the user.
 * @param body.password - The password of the user.
 * @param body.role - The role of the user.
 * @returns The response from the API.
 */
export async function updateUser(
  _userId: string,
  body: unknown
): Promise<UpdateUserResponse> {
  const actor = await getCurrentUserServer();
  if (!actor || actor.role !== "admin") {
    return { error: "Unauthorized: admin access required" };
  }

  const { cleanedPatch, errors } = validateUserUpdateBody(body);

  if (errors.length > 0 || !cleanedPatch) {
    return {
      error: "Invalid request body",
      validationErrors: errors,
    };
  }

  const supabase = createAdminClient();
  // these three fields in the allowed fields are inside the auth table
  const authUpdatePayload: {
    email?: string;
    email_confirm?: boolean;
    password?: string;
    phone?: string;
  } = {};

  if (cleanedPatch.email) {
    authUpdatePayload.email = cleanedPatch.email;
    authUpdatePayload.email_confirm = true;
  }
  if (cleanedPatch.password) authUpdatePayload.password = cleanedPatch.password;

  // these two fields are inside the public user table
  const userTableUpdatePayload: Record<string, string | null> = {};
  if (cleanedPatch.name) userTableUpdatePayload["name"] = cleanedPatch.name;
  if ("role" in cleanedPatch) {
    userTableUpdatePayload["role"] =
      cleanedPatch.role.trim() === "" ? null : cleanedPatch.role;
  }

  const hasTableUpdates = Object.keys(userTableUpdatePayload).length > 0;
  const hasAuthUpdates = Object.keys(authUpdatePayload).length > 0;

  // we want to return error and revert changes if either update fails
  const rollbackUserTablePayload: Record<string, string | null> = {};

  if (hasTableUpdates && hasAuthUpdates) {
    const { data: existingUser, error: existingUserError } = await supabase
      .from("Users")
      .select("*")
      .eq("id", _userId)
      .single();

    if (existingUserError) {
      return { error: existingUserError.message };
    }

    // save existing data in case we need to revert
    const existingUserRecord = existingUser as Record<string, unknown>;

    if ("name" in userTableUpdatePayload) {
      rollbackUserTablePayload["name"] =
        typeof existingUserRecord["name"] === "string"
          ? existingUserRecord["name"]
          : null;
    }

    if ("role" in userTableUpdatePayload) {
      rollbackUserTablePayload["role"] =
        typeof existingUserRecord["role"] === "string"
          ? existingUserRecord["role"]
          : null;
    }
  }

  // attempt to update public user table
  if (hasTableUpdates) {
    const { error: userTableError } = await supabase
      .from("Users")
      .update(userTableUpdatePayload)
      .eq("id", _userId)
      .select("id")
      .single();

    // if failed, do not attempt to update auth user table
    if (userTableError) {
      return { error: userTableError.message };
    }
  }

  // attempt to update auth user table
  if (hasAuthUpdates) {
    const { error } = await supabase.auth.admin.updateUserById(
      _userId,
      authUpdatePayload
    );

    // if failed, attempt to revert public user table changes
    if (error) {
      if (hasTableUpdates) {
        const { error: rollbackError } = await supabase
          .from("Users")
          .update(rollbackUserTablePayload)
          .eq("id", _userId)
          .select("id")
          .single();

        if (rollbackError) {
          return {
            error: `Auth update failed: ${error.message}. Rollback failed: ${rollbackError.message}`,
          };
        }
      }

      return { error: error.message };
    }
  }

  return { data: cleanedPatch };
}

/**
 * Updates the **currently signed-in** user using the session Supabase client
 * (publishable key + cookies). Use this for self-service account settings so
 * `SUPABASE_SERVICE_ROLE_KEY` is not required. Admin-only flows should keep
 * using {@link updateUser} with the service role.
 */
export async function updateCurrentUserAccount(
  sessionClient: SupabaseClient<Database>,
  body: unknown
): Promise<UpdateUserResponse> {
  const { cleanedPatch, errors } = validateUserUpdateBody(body);

  if (errors.length > 0 || !cleanedPatch) {
    return {
      error: "Invalid request body",
      validationErrors: errors,
    };
  }

  if (cleanedPatch.role !== undefined) {
    return { error: "Role cannot be changed from account settings" };
  }

  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    return { error: "Not signed in" };
  }

  const authUpdatePayload: { email?: string; password?: string } = {};
  const currentEmail = (user.email ?? "").trim();
  if (cleanedPatch.email && cleanedPatch.email !== currentEmail) {
    authUpdatePayload.email = cleanedPatch.email;
  }
  if (cleanedPatch.password) {
    authUpdatePayload.password = cleanedPatch.password;
  }

  const userTableUpdatePayload: Record<string, string> = {};
  if (cleanedPatch.name) {
    userTableUpdatePayload["name"] = cleanedPatch.name;
  }

  const hasTableUpdates = Object.keys(userTableUpdatePayload).length > 0;
  const hasAuthUpdates = Object.keys(authUpdatePayload).length > 0;

  if (!hasTableUpdates && !hasAuthUpdates) {
    return { data: cleanedPatch };
  }

  const rollbackUserTablePayload: Record<string, string | null> = {};

  if (hasTableUpdates && hasAuthUpdates) {
    const { data: existingUser, error: existingUserError } = await sessionClient
      .from("Users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (existingUserError) {
      return { error: existingUserError.message };
    }

    const existingUserRecord = existingUser as Record<string, unknown>;

    if ("name" in userTableUpdatePayload) {
      rollbackUserTablePayload["name"] =
        typeof existingUserRecord["name"] === "string"
          ? existingUserRecord["name"]
          : null;
    }
  }

  if (hasTableUpdates) {
    const { error: userTableError } = await sessionClient
      .from("Users")
      .update(userTableUpdatePayload)
      .eq("id", user.id)
      .select("id")
      .single();

    if (userTableError) {
      return { error: userTableError.message };
    }
  }

  if (hasAuthUpdates) {
    const { error } = await sessionClient.auth.updateUser(authUpdatePayload);

    if (error) {
      if (hasTableUpdates && Object.keys(rollbackUserTablePayload).length > 0) {
        const { error: rollbackError } = await sessionClient
          .from("Users")
          .update(rollbackUserTablePayload)
          .eq("id", user.id)
          .select("id")
          .single();

        if (rollbackError) {
          return {
            error: `Auth update failed: ${error.message}. Rollback failed: ${rollbackError.message}`,
          };
        }
      }

      return { error: error.message };
    }
  }

  return { data: cleanedPatch };
}
