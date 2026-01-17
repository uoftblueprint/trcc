import { describe, it, expect, vi } from "vitest";
import { filter_by_general_info } from "../../../src/lib/api/getVolunteerByGeneralInfo";
import { createClient } from "@/lib/client/supabase/server";

vi.mock("@/lib/client/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("validateFilter (unit)", () => {
  it("returns error if values are empty", async (): Promise<void> => {
    const result = await filter_by_general_info("AND", "name_org", []);
    expect(result.data).toBeNull();
    expect(result.error).toBe("No values provided.");
  });

  it("returns empty data if AND has multiple unique values", async (): Promise<void> => {
    const result = await filter_by_general_info("AND", "email", [
      "v1@mail.com",
      "v2@mail.com",
    ]);
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("accepts valid AND operation", async (): Promise<void> => {
    const eqMock = vi.fn((): { data: unknown[]; error: null } => ({
      data: [],
      error: null,
    }));

    vi.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: eqMock,
        }),
      }),
    });
    await filter_by_general_info("AND", "email", ["v1@mail.com"]);
    expect(eqMock).toHaveBeenCalledWith("email", "v1@mail.com");
  });

  (it("accepts valid OR operation"),
    async (): Promise<void> => {
      const inMock = vi.fn((): { data: unknown[]; error: null } => ({
        data: [],
        error: null,
      }));

      vi.mocked(createClient).mockResolvedValue({
        from: () => ({
          select: () => ({
            in: inMock,
          }),
        }),
      });
      await filter_by_general_info("OR", "pronouns", ["He/him", "She/her"]);
      expect(inMock).toHaveBeenCalledWith("pronouns", "He/him", "She/her");
    });


});
