import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "../client/supabase/server";
import type { Tables, TablesUpdate } from "../client/supabase/types";

export type VolunteerUpdatePayload = Pick<
  TablesUpdate<"Volunteers">,
  | "name_org"
  | "email"
  | "phone"
  | "pronouns"
  | "pseudonym"
  | "position"
  | "notes"
  | "opt_in_communication"
>;

type VolunteerUpdateResponse = {
  volunteer: Tables<"Volunteers"> | null;
  error: PostgrestError | null;
};

// keep this in sync with allowed patch fields on the volunteers table
const ALLOWED_FIELDS = new Set<keyof VolunteerUpdatePayload>([
  "name_org",
  "email",
  "phone",
  "pronouns",
  "pseudonym",
  "position",
  "notes",
  "opt_in_communication",
]);

export function validateVolunteerUpdateBody(body: unknown): {
  updates?: VolunteerUpdatePayload;
  error?: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const payload = body as Record<string, unknown>;
  const unknownKeys = Object.keys(payload).filter(
    (key) => !ALLOWED_FIELDS.has(key as keyof VolunteerUpdatePayload)
  );

  if (unknownKeys.length > 0) {
    return {
      error: `Unknown field(s): ${unknownKeys.join(", ")}`,
    };
  }

  // name_org is the only required patchable field; validate it eagerly
  const updates: Partial<VolunteerUpdatePayload> = {};
  if ("name_org" in payload) {
    const value = payload.name_org;
    if (value === null || value === undefined) {
      return { error: "Field name_org must be provided as a non-empty string" };
    }
    if (typeof value !== "string") {
      return { error: "Field name_org must be a string" };
    }
    if (value.trim().length === 0) {
      return { error: "Field name_org cannot be empty" };
    }
    updates.name_org = value;
  }

  // optional string-ish fields can be patched with string or null
  const stringFields = [
    "email",
    "phone",
    "pronouns",
    "pseudonym",
    "position",
    "notes",
  ] as const;
  type StringFieldKey = (typeof stringFields)[number];

  for (const key of stringFields) {
    if (key in payload) {
      const value = payload[key];

      if (value !== null && value !== undefined && typeof value !== "string") {
        return { error: `Field ${key} must be a string or null` };
      }

      updates[key] = value as VolunteerUpdatePayload[StringFieldKey];
    }
  }

  if ("opt_in_communication" in payload) {
    const value = payload.opt_in_communication;
    if (value !== null && value !== undefined && typeof value !== "boolean") {
      return {
        error: "Field opt_in_communication must be a boolean or null",
      };
    }
    updates.opt_in_communication =
      value as VolunteerUpdatePayload["opt_in_communication"];
  }

  const hasFields = Object.keys(updates).length > 0;
  if (!hasFields) {
    return { error: "At least one updatable field is required" };
  }

  return { updates: updates as VolunteerUpdatePayload };
}

export async function updateVolunteer(
  volunteerId: number,
  updates: VolunteerUpdatePayload
): Promise<VolunteerUpdateResponse> {
  const client = await createClient();

  const { data, error } = await client
    .from("Volunteers")
    .update({ ...updates })
    .eq("id", volunteerId)
    .select()
    .single();

  if (error) {
    return { volunteer: null, error };
  }

  return { volunteer: data, error: null };
}
