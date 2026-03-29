/**
 * Fetches all volunteers with their associated cohorts and roles.
 *
 * @returns A Promise resolving to an array of VolunteerTableEntry objects,
 *   where each entry contains:
 *   - volunteer: The volunteer's core information
 *   - cohorts: Array of cohorts the volunteer belongs to
 *   - roles: Array of roles assigned to the volunteer
 *
 * @throws Error if the Supabase query fails
 *
 * @example
 * const volunteersData = await getVolunteersTable();
 * // Returns:
 * // [
 * //   { volunteer: Volunteer1, cohorts: [Cohort1, Cohort2], roles: [Role1, Role2] },
 * //   { volunteer: Volunteer2, cohorts: [Cohort1], roles: [Role1] },
 * //   ...
 * // ]
 */

"use server";

import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";

type VolunteerRow = Database["public"]["Tables"]["Volunteers"]["Row"];
type CohortRow = Database["public"]["Tables"]["Cohorts"]["Row"];
type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];

export interface VolunteerTableEntry {
  volunteer: VolunteerRow;
  cohorts: CohortRow[];
  roles: RoleRow[];
}

// Explicit type for Supabase nested select response to override incorrect inferred type
type VolunteerWithRelations = VolunteerRow & {
  VolunteerCohorts: Array<{ Cohorts: CohortRow | null }>;
  VolunteerRoles: Array<{ Roles: RoleRow | null }>;
};

export async function getVolunteersTable(): Promise<VolunteerTableEntry[]> {
  const client = await createClient();

  // Log connection and auth state to help debug RLS issues
  console.log(
    "[getVolunteersTable] NEXT_PUBLIC_SUPABASE_URL:",
    process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "NOT SET"
  );
  console.log(
    "[getVolunteersTable] API_URL:",
    process.env["API_URL"] ?? "NOT SET"
  );
  console.log(
    "[getVolunteersTable] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:",
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]?.slice(0, 20) + "..." ||
      "NOT SET"
  );
  console.log(
    "[getVolunteersTable] PUBLISHABLE_KEY:",
    process.env["PUBLISHABLE_KEY"]?.slice(0, 20) + "..." || "NOT SET"
  );
  const {
    data: { user: authUser },
    error: authError,
  } = await client.auth.getUser();
  console.log("[getVolunteersTable] auth user id:", authUser?.id ?? "NONE");
  console.log("[getVolunteersTable] auth user role:", authUser?.role ?? "NONE");
  console.log("[getVolunteersTable] auth error:", authError?.message ?? "none");

  // Check RLS policies directly - query a simple count to isolate the issue
  const { count, error: countError } = await client
    .from("Volunteers")
    .select("*", { count: "exact", head: true });
  console.log(
    "[getVolunteersTable] count query result:",
    count,
    "error:",
    countError ? JSON.stringify(countError) : "none"
  );

  // Single query with nested selects - type assertion for proper array inference
  const { data, error } = (await client
    .from("Volunteers")
    .select(
      `
      *,
      VolunteerCohorts ( Cohorts (*) ),
      VolunteerRoles ( Roles (*) )
    `
    )
    .order("id", { ascending: true })) as {
    data: VolunteerWithRelations[] | null;
    error: PostgrestError | null;
  };

  console.log(
    "[getVolunteersTable] query error:",
    error ? JSON.stringify(error) : "none"
  );
  console.log("[getVolunteersTable] row count:", data?.length ?? 0);

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  if (!data || data.length === 0) {
    console.log(
      "[getVolunteersTable] No data returned — possible RLS issue if rows exist in the table"
    );
    return [];
  }

  // Transform nested structure to flat format
  const result: VolunteerTableEntry[] = data.map((volunteerData) => {
    // Extract volunteer fields and nested relation arrays
    const { VolunteerCohorts, VolunteerRoles, ...volunteer } = volunteerData;

    // Extract cohorts from nested VolunteerCohorts relation
    const cohorts: CohortRow[] = (VolunteerCohorts ?? [])
      .map((vc) => vc.Cohorts)
      .filter((cohort): cohort is CohortRow => cohort !== null);

    // Extract roles from nested VolunteerRoles relation
    const roles: RoleRow[] = (VolunteerRoles ?? [])
      .map((vr) => vr.Roles)
      .filter((role): role is RoleRow => role !== null);

    return {
      volunteer: volunteer as VolunteerRow,
      cohorts,
      roles,
    };
  });

  return result;
}
