// Example test for getExample function
// This test is not meaningful as is, but serves as a template
// You should modify it to fit your actual implementation and testing needs

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getExample } from "@/lib/api/getExample";
import { createClient } from "@/lib/client/supabase/server";

// Mock the Supabase client
vi.mock("@/lib/client/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("getExample", () => {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockClient = { from: mockFrom };

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - Partial mock of SupabaseClient for testing
    vi.mocked(createClient).mockResolvedValue(mockClient);
    mockSelect.mockResolvedValue({ data: [{ id: 1, name: "Test Volunteer" }] });
  });

  it("should fetch volunteers data successfully", async () => {
    const result = await getExample("test");

    expect(createClient).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalled();
    expect(result).toEqual({ data: [{ id: 1, name: "Test Volunteer" }] });
  });
});
