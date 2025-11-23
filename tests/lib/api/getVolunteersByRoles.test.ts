// Example test for getExample function
// This test is not meaningful as is, but serves as a template
// You should modify it to fit your actual implementation and testing needs

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getVolunteersByRoles } from "@/lib/api/getVolunteersByRoles";
import { createClient } from "@/lib/client/supabase/server";

const Roles1 = [
  {
    Roles: { name: "Role 1" },
    Volunteers: {
      id: 1,
    },
  },
  {
    Roles: { name: "Role 1" },
    Volunteers: {
      id: 3,
    },
  },
];

const Roles2 = [
  {
    Roles: { name: "Role 2" },
    Volunteers: {
      id: 2,
    },
  },
  {
    Roles: { name: "Role 2" },
    Volunteers: {
      id: 3,
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
  });

  it("returns error response for an invalid operator", async () => {
    const result = await getVolunteersByRoles("INVALID", ["Role 1"]);
    expect(result.status).toBe(400);
    expect(result).toEqual({ status: 400, error: "Operator is not AND or OR" });
  });

  it("returns error response if the filters array is malformed", async () => {
    const result = await getVolunteersByRoles("OR", [1]);
    expect(result.status).toBe(400);
    expect(result).toEqual({
      status: 400,
      error: "Roles to filter by are not all strings",
    });
  });

  it("returns all volunteers with Role 1 or Role 2", async () => {
    mockIn.mockResolvedValueOnce({ data: [...Roles1, ...Roles2], error: null });

    const result = await getVolunteersByRoles("OR", ["Role 1", "Role 2"]);
    expect(result.status).toBe(200);
    expect(result).toHaveProperty("data");

    const ids = result.data?.map((volunteer) => volunteer.id).sort();
    expect(ids).toEqual([1, 2, 3]);
  });

  it("returns all volunteers with Role 1", async () => {
    mockIn.mockResolvedValueOnce({ data: Roles1, error: null });

    const result = await getVolunteersByRoles("OR", ["Role 1"]);
    expect(result.status).toBe(200);
    expect(result).toHaveProperty("data");

    const ids = result.data?.map((volunteer) => volunteer.id).sort();
    expect(ids).toEqual([1, 3]);
  });

  it("returns all volunteers with Role 1 AND Role2", async () => {
    mockIn.mockResolvedValueOnce({ data: [...Roles1, ...Roles2], error: null });

    const result = await getVolunteersByRoles("AND", ["Role 1", "Role 2"]);
    expect(result.status).toBe(200);
    expect(result).toHaveProperty("data");

    const ids = result.data?.map((volunteer) => volunteer.id).sort();
    expect(ids).toEqual([3]);
  });
});
