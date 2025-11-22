"use server";

import { createClient } from "../client/supabase/server";

export type FilterOp = "AND" | "OR";
export type CohortTuple = [string, string];

// Define the shape of the nested data coming from the join
interface VolunteerQueryJoin {
  [key: string]: unknown;
  VolunteerCohorts: {
    Cohorts: {
      term: string;
      year: number | string;
    };
  }[];
}

export async function getVolunteersByCohorts(
  op: FilterOp,
  values: CohortTuple[]
) {
  // Validate inputs
  if (op !== "AND" && op !== "OR") {
    return {
      data: null,
      error: { message: "Invalid operator. Must be AND or OR." },
      status: 400,
    };
  }

  if (!Array.isArray(values)) {
    return {
      data: null,
      error: { message: "Values must be an array." },
      status: 400,
    };
  }

  if (values.length === 0) {
    return {
      data: [],
      error: null,
      status: 200,
    };
  }

  // Build filter string
  const client = await createClient();
  const conditions = values.map(
    ([term, year]) => `and(term.eq."${term}",year.eq.${year})`
  );
  const orFilter = `(${conditions.join(",")})`;

  // Inner join to discard volunteers with 0 matching cohorts
  let query = client.from("Volunteers").select(`
        *,
        VolunteerCohorts!inner (
          Cohorts!inner (
            term,
            year
          )
        )
      `);

  // Apply or filter to the Cohorts table, returns table with only matching cohorts
  query = query.or(orFilter, { foreignTable: "VolunteerCohorts.Cohorts" });

  const { data, error } = await query;

  if (error) {
    console.error("Supabase Error:", error);
    return {
      data: null,
      error: error.message,
      status: 500,
    };
  }

  if (op === "AND") {
    // Cast data to the interface defined above, since table was joined above
    const volunteers = data as unknown as VolunteerQueryJoin[];

    const uniqueInputs = new Set(values.map((v) => `${v[0]}-${v[1]}`));
    const requiredCount = uniqueInputs.size;
    // Filter by checking length of cohorts and seeing if it equals required length
    const filteredData = volunteers.filter((volunteer) => {
      const matchedCohorts = volunteer.VolunteerCohorts;
      return matchedCohorts && matchedCohorts.length === requiredCount;
    });

    return {
      data: filteredData,
      error: null,
      status: 200,
    };
  }

  return {
    data,
    error: null,
    status: 200,
  };
}
