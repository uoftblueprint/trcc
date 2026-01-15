import { createClient } from "../client/supabase/server";
import type { Tables } from "@/lib/client/supabase/types";

type Volunteer = Tables<"Volunteers">;
type Operator = "OR" | "AND";

export function isAllStrings(arr: unknown[]): arr is string[] {
  return arr.every((item) => typeof item === "string");
}

export function isValidOperator(operator: string) {
  return (
    typeof operator === "string" &&
    ["OR", "AND"].includes(operator.toUpperCase())
  );
}

export async function getVolunteersByRoles(
  operator: Operator,
  filters: string[]
) {
  if (!isValidOperator(operator)) {
    return { status: 400, error: "Operator is not AND or OR" };
  }

  if (!isAllStrings(filters)) {
    return {
      status: 400,
      error: "Roles to filter by are not all strings",
    };
  }

  const client = await createClient();
  const { data: allRows, error } = await client
    .from("VolunteerRoles")
    .select(
      `
      Roles!inner (name),
      Volunteers!inner (*)
    `
    )
    .in("Roles.name", filters);

  // // console.log(allRows);
  // const allRows = [
  //   {
  //     Roles: { name: "Role 1" },
  //     Volunteers: {
  //       id: 1,
  //       email: "v1@mail.com",
  //       notes: "Notes for volunteer 1",
  //       phone: "123 456 7890",
  //       name_org: "Volunteer1",
  //       position: "member",
  //       pronouns: "He/him",
  //       pseudonym: "V1",
  //       created_at: "2025-11-10T01:26:20.619465+00:00",
  //       updated_at: "2025-11-10T01:26:20.619465+00:00",
  //       opt_in_communication: true,
  //     },
  //   },
  //   {
  //     Roles: { name: "Role 1" },
  //     Volunteers: {
  //       id: 1,
  //       email: "v1@mail.com",
  //       notes: "Notes for volunteer 1",
  //       phone: "123 456 7890",
  //       name_org: "Volunteer1",
  //       position: "member",
  //       pronouns: "He/him",
  //       pseudonym: "V1",
  //       created_at: "2025-11-10T01:26:20.619465+00:00",
  //       updated_at: "2025-11-10T01:26:20.619465+00:00",
  //       opt_in_communication: true,
  //     },
  //   },
  //   {
  //     Roles: { name: "Role 1" },
  //     Volunteers: {
  //       id: 3,
  //       email: null,
  //       notes: null,
  //       phone: "123 456 7890",
  //       name_org: "Volunteer3",
  //       position: null,
  //       pronouns: null,
  //       pseudonym: "V3",
  //       created_at: "2025-11-10T01:26:20.619465+00:00",
  //       updated_at: "2025-11-10T01:26:20.619465+00:00",
  //       opt_in_communication: true,
  //     },
  //   },
  //   {
  //     Roles: { name: "Role 2" },
  //     Volunteers: {
  //       id: 2,
  //       email: "v2@mail.com",
  //       notes: "Notes for volunteer 2",
  //       phone: "098 765 4321",
  //       name_org: "Volunteer2",
  //       position: "member",
  //       pronouns: "She/her",
  //       pseudonym: "V2",
  //       created_at: "2025-11-10T01:26:20.619465+00:00",
  //       updated_at: "2025-11-10T01:26:20.619465+00:00",
  //       opt_in_communication: false,
  //     },
  //   },
  //   {
  //     Roles: { name: "Role 2" },
  //     Volunteers: {
  //       id: 3,
  //       email: null,
  //       notes: null,
  //       phone: "123 456 7890",
  //       name_org: "Volunteer3",
  //       position: null,
  //       pronouns: null,
  //       pseudonym: "V3",
  //       created_at: "2025-11-10T01:26:20.619465+00:00",
  //       updated_at: "2025-11-10T01:26:20.619465+00:00",
  //       opt_in_communication: true,
  //     },
  //   },
  // ];

  if (error) {
    // console.error("Supabase error:", error.message);
    // console.error("Details:", error.details);
    // console.error("Hint:", error.hint);

    return {
      status: 500,
      error: `Failed to query Supabase database: ${error.message}`,
    };
  }

  const volunteerRoleMap = new Map<
    number,
    {
      row: Volunteer;
      roleNames: Set<string>;
    }
  >();

  for (const row of allRows) {
    const volunteerId = row.Volunteers.id;
    const roleName = row.Roles.name;

    let volunteerData = volunteerRoleMap.get(volunteerId);
    if (!volunteerData) {
      volunteerData = { row: row.Volunteers, roleNames: new Set<string>() };
      volunteerRoleMap.set(volunteerId, volunteerData);
    }

    volunteerData.roleNames.add(roleName);
  }

  const filteredVolunteers = [];
  if (operator.toUpperCase() == "OR") {
    for (const volunteer of volunteerRoleMap.values()) {
      filteredVolunteers.push({
        ...volunteer.row,
        filtered_roles: Array.from(volunteer.roleNames),
      });
    }
  } else {
    for (const volunteer of volunteerRoleMap.values()) {
      if (volunteer.roleNames.size === filters.length) {
        filteredVolunteers.push({
          ...volunteer.row,
          filtered_roles: Array.from(volunteer.roleNames),
        });
      }
    }
  }

  return { data: filteredVolunteers, status: 200 };
}
