import { describe, it, expect, vi, beforeEach } from "vitest";
import { getVolunteersByRoles } from "@/lib/api/getVolunteersByRoles";
import { createClient } from "@/lib/client/supabase/server";
import { makeTestVolunteerInsert } from "../support/factories";

const Roles1 = [
  {
    Roles: { name: "Role 1" },
    Volunteers: makeTestVolunteerInsert({ id: 1 }),
  },
  {
    Roles: { name: "Role 1" },
    Volunteers: makeTestVolunteerInsert({ id: 3 }),
  },
];

const Roles2 = [
  {
    Roles: { name: "Role 2" },
    Volunteers: makeTestVolunteerInsert({ id: 2 }),
  },
  {
    Roles: { name: "Role 2" },
    Volunteers: makeTestVolunteerInsert({ id: 3 }),
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

  it("returns no volunteers given empty array of filters", async () => {
    mockIn.mockResolvedValueOnce({ data: [], error: null });

    const result = await getVolunteersByRoles("OR", ["Role 1", "Role 2"]);
    expect(result.status).toBe(200);
    expect(result).toHaveProperty("data");
    expect(result.data).toHaveLength(0);
  });

  it("returns error response for an invalid operator", async () => {
    const { data, error, status } = await getVolunteersByRoles("INVALID", [
      "Role 1",
    ]);
    expect(data).toBeNull();
    expect(status).toBe(400);
    expect(error).toEqual("Operator is not AND or OR");
  });

  it("returns error response if the filters array is malformed", async () => {
    const { data, error, status } = await getVolunteersByRoles("OR", [1]);
    expect(data).toBeNull();
    expect(status).toBe(400);
    expect(error).toEqual("Roles to filter by are not all strings");
  });

  it("returns all volunteers with Role 1 OR Role 2", async () => {
    mockIn.mockResolvedValueOnce({ data: [...Roles1, ...Roles2], error: null });

    const result = await getVolunteersByRoles("OR", ["Role 1", "Role 2"]);
    expect(result.status).toBe(200);
    expect(result).toHaveProperty("data");

    const rolesByVolunteerId = new Map(
      result.data?.map((volunteer) => [volunteer.id, volunteer.filtered_roles])
    );

    expect([...rolesByVolunteerId.keys()]).toHaveLength(3);
    expect([...rolesByVolunteerId.keys()]).toEqual(
      expect.arrayContaining([1, 2, 3])
    );

    expect(rolesByVolunteerId.get(1)).toHaveLength(1);
    expect(rolesByVolunteerId.get(1)).toEqual(
      expect.arrayContaining(["Role 1"])
    );

    expect(rolesByVolunteerId.get(2)).toHaveLength(1);
    expect(rolesByVolunteerId.get(2)).toEqual(
      expect.arrayContaining(["Role 2"])
    );

    expect(rolesByVolunteerId.get(3)).toHaveLength(2);
    expect(rolesByVolunteerId.get(3)).toEqual(
      expect.arrayContaining(["Role 1", "Role 2"])
    );
  });

  it("returns all volunteers with Role 1", async () => {
    mockIn.mockResolvedValueOnce({ data: Roles1, error: null });

    const result = await getVolunteersByRoles("OR", ["Role 1"]);
    expect(result.status).toBe(200);
    expect(result).toHaveProperty("data");

    const rolesByVolunteerId = new Map(
      result.data?.map((volunteer) => [volunteer.id, volunteer.filtered_roles])
    );

    expect([...rolesByVolunteerId.keys()]).toHaveLength(2);
    expect([...rolesByVolunteerId.keys()]).toEqual(
      expect.arrayContaining([1, 3])
    );

    expect(rolesByVolunteerId.get(1)).toHaveLength(1);
    expect(rolesByVolunteerId.get(1)).toEqual(
      expect.arrayContaining(["Role 1"])
    );

    expect(rolesByVolunteerId.get(3)).toHaveLength(1);
    expect(rolesByVolunteerId.get(3)).toEqual(
      expect.arrayContaining(["Role 1"])
    );
  });

  it("returns all volunteers with Role 1 AND Role2", async () => {
    mockIn.mockResolvedValueOnce({ data: [...Roles1, ...Roles2], error: null });

    const result = await getVolunteersByRoles("AND", ["Role 1", "Role 2"]);
    expect(result.status).toBe(200);
    expect(result).toHaveProperty("data");

    const rolesByVolunteerId = new Map(
      result.data?.map((volunteer) => [volunteer.id, volunteer.filtered_roles])
    );

    expect([...rolesByVolunteerId.keys()]).toEqual([3]);

    expect(rolesByVolunteerId.get(3)).toHaveLength(2);
    expect(rolesByVolunteerId.get(3)).toEqual(
      expect.arrayContaining(["Role 1", "Role 2"])
    );
  });
});
