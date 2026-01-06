import type { Database } from "@/lib/client/supabase/types";

// Type Aliases
export type CohortInsert = Database["public"]["Tables"]["Cohorts"]["Insert"];
export type RoleInsert = Database["public"]["Tables"]["Roles"]["Insert"];
export type VolunteerInsert =
  Database["public"]["Tables"]["Volunteers"]["Insert"];
export type VolunteerCohortInsert =
  Database["public"]["Tables"]["VolunteerCohorts"]["Insert"];
export type VolunteerRoleInsert =
  Database["public"]["Tables"]["VolunteerRoles"]["Insert"];

// Valid Values (from CHECK constraints)
export const VALID_ROLE_TYPES = [
  "prior",
  "current",
  "future_interest",
] as const;
export type RoleType = (typeof VALID_ROLE_TYPES)[number];

// From: volunteers_position_check
export const VALID_VOLUNTEER_POSITIONS = [
  "member",
  "volunteer",
  "staff",
] as const;
export type VolunteerPosition = (typeof VALID_VOLUNTEER_POSITIONS)[number];

// From: cohorts_term_check (likely constraint based on validateFilter)
export const VALID_COHORT_TERMS = [
  "Fall",
  "Spring",
  "Summer",
  "Winter",
] as const;
export type CohortTerm = (typeof VALID_COHORT_TERMS)[number];

// Test data markers
export const TEST_YEAR = 2099; // Use this year for all test cohorts (easy cleanup)

// Utility Functions
function randomToken(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function uniqueTestId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

// Cohorts Factory
export function makeTestCohortInsert(
  overrides: Partial<CohortInsert> = {}
): CohortInsert {
  return {
    id: overrides.id ?? uniqueTestId(),
    // 'Fall', 'Spring', 'Summer', 'Winter'
    term: overrides.term ?? "Fall",
    year: overrides.year ?? TEST_YEAR,
    is_active: overrides.is_active ?? false,
    ...overrides,
  };
}

// Roles Factory
// ─────────────────────────────────────────────────────────────────────────────
export function makeTestRoleInsert(
  overrides: Partial<RoleInsert> = {}
): RoleInsert {
  const token = randomToken();
  return {
    id: overrides.id ?? uniqueTestId(),
    name: overrides.name ?? `TEST_Role_${token}`,
    // Must be one of: 'prior', 'current', 'future_interest'
    type: overrides.type ?? "current",
    is_active: overrides.is_active ?? true,
    ...overrides,
  };
}

// Volunteers Factory
export function makeTestVolunteerInsert(
  overrides: Partial<VolunteerInsert> = {}
): VolunteerInsert {
  const token = randomToken();
  return {
    id: overrides.id ?? uniqueTestId(),
    name_org: overrides.name_org ?? `TEST_Volunteer_${token}`,
    pseudonym: overrides.pseudonym ?? `TestPseudonym_${token}`,
    pronouns: overrides.pronouns ?? "they/them",
    email: overrides.email ?? `test_${token}@example.com`,
    phone: overrides.phone ?? "555-0100",
    // 'member', 'volunteer', 'staff'
    position: overrides.position ?? "volunteer",
    opt_in_communication: overrides.opt_in_communication ?? true,
    notes: overrides.notes ?? "Test notes",
    ...overrides,
  };
}

// Junction Table Factories
export function makeTestVolunteerCohortInsert(
  volunteerId: number,
  cohortId: number
): VolunteerCohortInsert {
  return {
    volunteer_id: volunteerId,
    cohort_id: cohortId,
  };
}

export function makeTestVolunteerRoleInsert(
  volunteerId: number,
  roleId: number
): VolunteerRoleInsert {
  return {
    volunteer_id: volunteerId,
    role_id: roleId,
  };
}

// Composite Factories (for complex test scenarios)
// Creates a complete volunteer test scenario with cohorts and roles
export type VolunteerWithRelationsFactory = {
  volunteer: VolunteerInsert;
  cohort: CohortInsert;
  role: RoleInsert;
  makeVolunteerCohort: (vId: number, cId: number) => VolunteerCohortInsert;
  makeVolunteerRole: (vId: number, rId: number) => VolunteerRoleInsert;
};

export function makeTestVolunteerWithRelations(overrides?: {
  volunteer?: Partial<VolunteerInsert>;
  cohort?: Partial<CohortInsert>;
  role?: Partial<RoleInsert>;
}): VolunteerWithRelationsFactory {
  const volunteer = makeTestVolunteerInsert(overrides?.volunteer);
  const cohort = makeTestCohortInsert(overrides?.cohort);
  const role = makeTestRoleInsert(overrides?.role);

  return {
    volunteer,
    cohort,
    role,
    makeVolunteerCohort: (vId: number, cId: number): VolunteerCohortInsert =>
      makeTestVolunteerCohortInsert(vId, cId),
    makeVolunteerRole: (vId: number, rId: number): VolunteerRoleInsert =>
      makeTestVolunteerRoleInsert(vId, rId),
  };
}
