import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { filter_by_general_info } from "../../../src/lib/api/getVolunteerByGeneralInfo";
import { createClient } from "@/lib/client/supabase/server";

type MockSupabaseClient = {
  from: vi.Mock;
  select: vi.Mock;
  eq: vi.Mock;
  in: vi.Mock;
};

vi.mock("@/lib/client/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("filter_by_general_info (unit)", () => {
  let mockClient: MockSupabaseClient;

  beforeEach(() => {
    mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(),
      in: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns error if values are empty", async () => {
    const result = await filter_by_general_info("AND", "name_org", []);
    expect(result.data).toBeNull();
    expect(result.error).toBe("No values provided.");
  });

  it("returns empty data if AND has multiple unique values", async () => {
    const result = await filter_by_general_info("AND", "email", [
      "v1@mail.com",
      "v2@mail.com",
    ]);
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("accepts valid AND operation", async () => {
    const mockData = [{ id: 1, email: "v1@mail.com" }];
    mockClient.eq.mockResolvedValue({ data: mockData, error: null });

    const result = await filter_by_general_info("AND", "email", [
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
    mockClient.in.mockResolvedValue({ data: mockData, error: null });

    const result = await filter_by_general_info("OR", "pronouns", [
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
