import { Database } from "@/lib/client/supabase/types";

export type VolunteerRow = Database["public"]["Tables"]["Volunteers"]["Row"];
export type CohortRow = Database["public"]["Tables"]["Cohorts"]["Row"];
export type RoleRow = Database["public"]["Tables"]["Roles"]["Row"];

export interface Volunteer extends Omit<VolunteerRow, "opt_in_communication"> {
  opt_in_communication: string;
  cohorts: string[];
  prior_roles: string[];
  current_roles: string[];
  future_interests: string[];
}
