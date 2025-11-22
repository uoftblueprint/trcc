import { createClient } from "../client/supabase/server";

type Volunteer = {
  id: number;
  created_at: string;
  updated_at: string;
  email: string | null;
  phone: string | null;
  name_org: string;
  notes: string | null;
  opt_in_communication: boolean | null;
  position: string | null;
  pronouns: string | null;
  pseudonym: string | null;
};

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

  if (error) {
    console.error("Supabase error:", error.message);
    console.error("Details:", error.details);
    console.error("Hint:", error.hint);

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
        role_names: Array.from(volunteer.roleNames),
      });
    }
  } else {
    for (const volunteer of volunteerRoleMap.values()) {
      if (volunteer.roleNames.size == filters.length) {
        filteredVolunteers.push({
          ...volunteer.row,
          roles: Array.from(volunteer.roleNames),
        });
      }
    }
  }

  return { data: filteredVolunteers, status: 200 };
}
