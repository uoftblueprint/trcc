import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "@/lib/client/supabase/server";
import { getVolunteerByGeneralInfo } from "../../../src/lib/api/getVolunteerByGeneralInfo";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import { makeTestVolunteerInsert } from "../support/factories";
import type { Tables } from "@/lib/client/supabase/types";

// Mock client type for Supabase
type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
};

vi.mock("@/lib/client/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("getVolunteerByGeneralInfo (unit)", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    // Single object with mockReturnThis() for chainable interface
    mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(),
      in: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockResolvedValue(mockClient as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns error if values are empty", async () => {
    const result = await getVolunteerByGeneralInfo("AND", "name_org", []);
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("No values provided.");
  });

  it("returns empty data if AND has multiple unique values", async () => {
    const result = await getVolunteerByGeneralInfo("AND", "email", [
      "v1@mail.com",
      "v2@mail.com",
    ]);
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("accepts valid AND operation", async () => {
    const mockData = [{ id: 1, email: "v1@mail.com" }];
    mockClient.eq!.mockResolvedValue({ data: mockData, error: null });

    const result = await getVolunteerByGeneralInfo("AND", "email", [
      "v1@mail.com",
    ]);

    expect(mockClient.from).toHaveBeenCalledWith("Volunteers");
    expect(mockClient.eq).toHaveBeenCalledWith("email", "v1@mail.com");
    expect(result).toEqual({ data: mockData, error: null });
  });

  it("accepts valid OR operation", async () => {
    const mockData = [
      { id: 1, pronouns: "He/him" },
      { id: 2, pronouns: "She/her" },
    ];
    mockClient.in!.mockResolvedValue({ data: mockData, error: null });

    const result = await getVolunteerByGeneralInfo("OR", "pronouns", [
      "He/him",
      "She/her",
    ]);

    expect(mockClient.from).toHaveBeenCalledWith("Volunteers");
    expect(mockClient.in).toHaveBeenCalledWith("pronouns", [
      "He/him",
      "She/her",
    ]);
    expect(result).toEqual({ data: mockData, error: null });
  });
});

// Integration test begins here
describe("db: getVolunteerByGeneralInfo(integration)", () => {
  const client = createServiceTestClient();

  beforeEach(async () => {
    vi.mocked(createClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof createClient>>
    );
    // Ensure data is cleaned up before testing
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    // Insert test data
    const { error } = await client.from("Volunteers").insert([
      makeTestVolunteerInsert({
        name_org: "TEST_OR_A",
        email: "a@test.com",
      }),
      makeTestVolunteerInsert({
        name_org: "TEST_OR_B",
        email: "b@test.com",
      }),
      makeTestVolunteerInsert({
        name_org: "TEST_OR_C",
        email: "other@test.com",
      }),
    ]);

    if (error) {
      throw new Error(`Setup failed: ${error.message}`);
    }
  });

  afterEach(async () => {
    // Cleanup test data
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
  });

  it("returns volunteers matching ANY email (OR)", async () => {
    const result = await getVolunteerByGeneralInfo("OR", "email", [
      "a@test.com",
      "b@test.com",
    ]);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);

    type VolunteerRow = Tables<"Volunteers">;
    const volunteers: VolunteerRow[] = result.data ?? [];
    const emails = volunteers.map((v) => v.email);

    expect(emails).toContain("a@test.com");
    expect(emails).toContain("b@test.com");
  });

  it("returns volunteer when AND matches single value", async () => {
    const result = await getVolunteerByGeneralInfo("AND", "email", [
      "a@test.com",
    ]);

    expect(result.error).toBeNull();
    if (!result.data || result.data.length !== 1) {
      throw new Error("Expected exactly one volunteer");
    }

    const volunteer = result.data[0]!;
    expect(volunteer.email).toBe("a@test.com");
  });

  it("returns empty data if AND has multiple unique values", async () => {
    const result = await getVolunteerByGeneralInfo("AND", "email", [
      "v1@mail.com",
      "v2@mail.com",
    ]);
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });
});
