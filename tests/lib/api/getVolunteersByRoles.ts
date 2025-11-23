// Example test for getExample function
// This test is not meaningful as is, but serves as a template
// You should modify it to fit your actual implementation and testing needs

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getVolunteersByRoles,
  isAllStrings,
  isValidOperator,
} from "@/lib/api/index";
import { createClient } from "@/lib/client/supabase/server";

const volunteerTestData = [
  {
    name_org: "Volunteer1",
    pseudonym: "V1",
    pronouns: "He/him",
    email: "v1@mail.com",
    phone: "123 456 7890",
    position: "member",
    opt_in_communication: true,
    notes: "Notes for volunteer 1",
    created_at: "2025-11-10T01:26:20.619465+00:00",
    updated_at: "2025-11-10T01:26:20.619465+00:00",
    id: 1,
  },
  {
    name_org: "Volunteer2",
    pseudonym: "V2",
    pronouns: "She/her",
    email: "v2@mail.com",
    phone: "098 765 4321",
    position: "member",
    opt_in_communication: false,
    notes: "Notes for volunteer 2",
    created_at: "2025-11-10T01:26:20.619465+00:00",
    updated_at: "2025-11-10T01:26:20.619465+00:00",
    id: 2,
  },
  {
    name_org: "Volunteer3",
    pseudonym: "V3",
    pronouns: null,
    email: null,
    phone: "123 456 7890",
    position: null,
    opt_in_communication: true,
    notes: null,
    created_at: "2025-11-10T01:26:20.619465+00:00",
    updated_at: "2025-11-10T01:26:20.619465+00:00",
    id: 3,
  },
  {
    name_org: "Jiji",
    pseudonym: null,
    pronouns: null,
    email: null,
    phone: null,
    position: null,
    opt_in_communication: true,
    notes: null,
    created_at: "2025-11-22T22:52:18.24417+00:00",
    updated_at: "2025-11-22T22:52:18.24417+00:00",
    id: 23,
  },
];

const volunteerRolesTestData = [
  {
    created_at: "2025-11-10T01:27:18.139166+00:00",
    role_id: 1,
    volunteer_id: 1,
  },
  {
    created_at: "2025-11-10T01:27:18.139166+00:00",
    role_id: 1,
    volunteer_id: 3,
  },
  {
    created_at: "2025-11-10T01:27:18.139166+00:00",
    role_id: 2,
    volunteer_id: 2,
  },
  {
    created_at: "2025-11-10T01:27:18.139166+00:00",
    role_id: 2,
    volunteer_id: 3,
  },
];

const RolesTestData = [
  {
    name: "Role 1",
    type: "current",
    is_active: true,
    created_at: "2025-11-10T01:26:45.632811+00:00",
    id: 1,
  },
  {
    name: "Role 2",
    type: "",
    is_active: false,
    created_at: "2025-11-10T01:26:45.632811+00:00",
    id: 2,
  },
];

const JoinedData = [
  {
    Roles: { name: "Role 1" },
    Volunteers: {
      id: 1,
      email: "v1@mail.com",
      notes: "Notes for volunteer 1",
      phone: "123 456 7890",
      name_org: "Volunteer1",
      position: "member",
      pronouns: "He/him",
      pseudonym: "V1",
      created_at: "2025-11-10T01:26:20.619465+00:00",
      updated_at: "2025-11-10T01:26:20.619465+00:00",
      opt_in_communication: true,
    },
  },
  {
    Roles: { name: "Role 1" },
    Volunteers: {
      id: 3,
      email: null,
      notes: null,
      phone: "123 456 7890",
      name_org: "Volunteer3",
      position: null,
      pronouns: null,
      pseudonym: "V3",
      created_at: "2025-11-10T01:26:20.619465+00:00",
      updated_at: "2025-11-10T01:26:20.619465+00:00",
      opt_in_communication: true,
    },
  },
  {
    Roles: { name: "Role 2" },
    Volunteers: {
      id: 2,
      email: "v2@mail.com",
      notes: "Notes for volunteer 2",
      phone: "098 765 4321",
      name_org: "Volunteer2",
      position: "member",
      pronouns: "She/her",
      pseudonym: "V2",
      created_at: "2025-11-10T01:26:20.619465+00:00",
      updated_at: "2025-11-10T01:26:20.619465+00:00",
      opt_in_communication: false,
    },
  },
  {
    Roles: { name: "Role 2" },
    Volunteers: {
      id: 3,
      email: null,
      notes: null,
      phone: "123 456 7890",
      name_org: "Volunteer3",
      position: null,
      pronouns: null,
      pseudonym: "V3",
      created_at: "2025-11-10T01:26:20.619465+00:00",
      updated_at: "2025-11-10T01:26:20.619465+00:00",
      opt_in_communication: true,
    },
  },
];

// Mock the Supabase client
vi.mock("@/lib/client/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("getVolunteersByRoles", () => {
  const mockIn = vi.fn();
  const mockSelect = vi.fn(() => ({ in: mockIn }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockClient = { from: mockFrom };

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - Partial mock of SupabaseClient for testing
    vi.mocked(createClient).mockResolvedValue(mockClient);
    mockIn.mockResolvedValue({ data: JoinedData, error: null });
  });

  it("returns error response for an invalid operator", async () => {
    const result = await getVolunteersByRoles("INVALID", ["Role 1"]);

    expect(result.status).toBe(400);
    expect(mockSelect).toHaveBeenCalled();
    expect(result).toEqual({ data: [{ id: 1, name: "Test Volunteer" }] });
  });
});
