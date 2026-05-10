/**
 * Fetches all volunteers with their associated roles.
 *
 * @returns A Promise resolving to an array of VolunteerTableEntry objects,
 *   where each entry contains the volunteer row and joined roles.
 */

"use server";

import { createClient } from "@/lib/client/supabase";
import type { Database } from "@/lib/client/supabase/types";
import type { PostgrestError } from "@supabase/supabase-js";

type VolunteerRow = Database["public"]["Tables"]["Volunteers"]["Row"];
type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];

export interface VolunteerTableEntry {
  volunteer: VolunteerRow;
  roles: RoleRow[];
}

type VolunteerWithRelations = VolunteerRow & {
  VolunteerRoles: Array<{ Roles: RoleRow | null }>;
};

export async function getVolunteersTable(): Promise<VolunteerTableEntry[]> {
  const client = await createClient();

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

  const { count, error: countError } = await client
    .from("Volunteers")
    .select("*", { count: "exact", head: true });
  console.log(
    "[getVolunteersTable] count query result:",
    count,
    "error:",
    countError ? JSON.stringify(countError) : "none"
  );

  const { data, error } = (await client
    .from("Volunteers")
    .select(
      `
      *,
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

  const result: VolunteerTableEntry[] = data.map((volunteerData) => {
    const { VolunteerRoles, ...volunteer } = volunteerData;

    const roles: RoleRow[] = (VolunteerRoles ?? [])
      .map((vr) => vr.Roles)
      .filter((role): role is RoleRow => role !== null);

    return {
      volunteer: volunteer as VolunteerRow,
      roles,
    };
  });

  return result;
}
