import { createClient } from "@/lib/client/supabase";
import type { Tables, TablesUpdate } from "@/lib/client/supabase/types";

type CohortPatch = Pick<TablesUpdate<"Cohorts">, "term" | "year" | "is_active">;

type UpdateCohortResult =
  | { status: 200; body: { cohort: Tables<"Cohorts"> } }
  | { status: 400 | 404 | 409 | 500; body: { error: string } };

const ALLOWED_FIELDS = new Set<keyof CohortPatch>([
  "term",
  "year",
  "is_active",
]);

function validateCohortUpdateBody(body: unknown): {
  updates?: CohortPatch;
  error?: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const payload = body as Record<string, unknown>;
  const unknownKeys = Object.keys(payload).filter(
    (key) => !ALLOWED_FIELDS.has(key as keyof CohortPatch)
  );

  if (unknownKeys.length > 0) {
    return { error: `Unknown field(s): ${unknownKeys.join(", ")}` };
  }

  const updates: CohortPatch = {};

  if ("term" in payload) {
    const term = payload["term"];
    if (typeof term !== "string") {
      return { error: "Field term must be a string" };
    }
    if (term.trim().length === 0) {
      return { error: "Field term cannot be empty" };
    }
    updates.term = term.trim();
  }

  if ("year" in payload) {
    const year = payload["year"];
    if (typeof year !== "number" || !Number.isFinite(year)) {
      return { error: "Field year must be one of the valid numeric values" };
    }
    updates.year = year;
  }

  if ("is_active" in payload) {
    const isActive = payload["is_active"];
    if (typeof isActive !== "boolean") {
      return { error: "Field is_active must be a boolean" };
    }
    updates.is_active = isActive;
  }

  if (Object.keys(updates).length === 0) {
    return { error: "At least one updatable field is required" };
  }

  return { updates };
}

export async function updateCohort(
  cohortId: unknown,
  body: unknown
): Promise<UpdateCohortResult> {
  if (!Number.isInteger(cohortId) || (cohortId as number) <= 0) {
    return { status: 400, body: { error: "Invalid cohort id" } };
  }

  const validation = validateCohortUpdateBody(body);
  if (!validation.updates) {
    return {
      status: 400,
      body: { error: validation.error ?? "Invalid cohort update payload" },
    };
  }

  const client = await createClient();

  const { data: existingCohort, error: existingCohortError } = await client
    .from("Cohorts")
    .select("id, term, year")
    .eq("id", cohortId as number)
    .single();

  if (existingCohortError) {
    if (existingCohortError.code === "PGRST116") {
      return { status: 404, body: { error: "Cohort not found" } };
    }
    return { status: 500, body: { error: existingCohortError.message } };
  }

  if (!existingCohort) {
    return { status: 404, body: { error: "Cohort not found" } };
  }

  const nextTerm = validation.updates.term ?? existingCohort.term;
  const nextYear = validation.updates.year ?? existingCohort.year;

  const { data: conflictingCohort, error: conflictingCohortError } =
    await client
      .from("Cohorts")
      .select("id")
      .eq("term", nextTerm)
      .eq("year", nextYear)
      .neq("id", cohortId as number)
      .maybeSingle();

  if (conflictingCohortError) {
    return { status: 500, body: { error: conflictingCohortError.message } };
  }

  if (conflictingCohort) {
    return {
      status: 409,
      body: { error: "A cohort with this term and year already exists" },
    };
  }

  const { data, error } = await client
    .from("Cohorts")
    .update(validation.updates)
    .eq("id", cohortId as number)
    .select()
    .single();

  if (error) {
    if (error.code === "23505" || error.code === "23514") {
      return { status: 409, body: { error: error.message } };
    }
    if (error.code === "PGRST116") {
      return { status: 404, body: { error: "Cohort not found" } };
    }
    return { status: 500, body: { error: error.message } };
  }

  if (!data) {
    return { status: 404, body: { error: "Cohort not found" } };
  }

  return { status: 200, body: { cohort: data } };
}
