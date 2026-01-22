import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteVolunteer } from "@/lib/api/deleteVolunteer";
import { createClient } from "@/lib/client/supabase/server";

// Mock the Supabase client
vi.mock("@/lib/client/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("deleteVolunteer", () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn(() => ({ select: mockSelect }));
  const mockDelete = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ delete: mockDelete }));
  const mockClient = { from: mockFrom };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockClient);
  });

  describe("input validation", () => {
    it("should return error for negative ID", async () => {
      const result = await deleteVolunteer(-1);

      expect(result).toEqual({
        error: {
          message: "Invalid volunteer ID. ID must be a positive integer.",
        },
        data: null,
        status: 400,
      });
      expect(createClient).not.toHaveBeenCalled();
    });

    it("should return error for zero ID", async () => {
      const result = await deleteVolunteer(0);

      expect(result).toEqual({
        error: {
          message: "Invalid volunteer ID. ID must be a positive integer.",
        },
        data: null,
        status: 400,
      });
      expect(createClient).not.toHaveBeenCalled();
    });

    it("should return error for non-integer ID", async () => {
      const result = await deleteVolunteer(1.5);

      expect(result).toEqual({
        error: {
          message: "Invalid volunteer ID. ID must be a positive integer.",
        },
        data: null,
        status: 400,
      });
      expect(createClient).not.toHaveBeenCalled();
    });
  });

  describe("successful deletion", () => {
    it("should delete volunteer successfully", async () => {
      mockSelect.mockResolvedValue({
        data: [{ id: 1 }],
        error: null,
      });

      const result = await deleteVolunteer(1);

      expect(createClient).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith("Volunteers");
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", 1);
      expect(mockSelect).toHaveBeenCalledWith("id");
      expect(result).toEqual({
        error: null,
        data: {
          message: "Volunteer deleted successfully.",
          id: 1,
        },
        status: 200,
      });
    });
  });

  describe("volunteer not found", () => {
    it("should return 404 when volunteer does not exist (empty array)", async () => {
      mockSelect.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await deleteVolunteer(999);

      expect(result).toEqual({
        error: {
          message: "Volunteer not found.",
        },
        data: null,
        status: 404,
      });
    });

    it("should return 404 when volunteer does not exist (null data)", async () => {
      mockSelect.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await deleteVolunteer(999);

      expect(result).toEqual({
        error: {
          message: "Volunteer not found.",
        },
        data: null,
        status: 404,
      });
    });
  });

  describe("database errors", () => {
    it("should handle delete error from database", async () => {
      mockSelect.mockResolvedValue({
        data: null,
        error: { message: "Database connection error" },
      });

      const result = await deleteVolunteer(1);

      expect(result).toEqual({
        error: {
          message: "Database connection error",
        },
        data: null,
        status: 500,
      });
    });

    it("should handle delete error without message", async () => {
      mockSelect.mockResolvedValue({
        data: null,
        error: {},
      });

      const result = await deleteVolunteer(1);

      expect(result).toEqual({
        error: {
          message: "Failed to delete volunteer.",
        },
        data: null,
        status: 500,
      });
    });
  });

  describe("unexpected errors", () => {
    it("should handle unexpected Error instances", async () => {
      (createClient as any).mockRejectedValue(new Error("Unexpected error"));

      const result = await deleteVolunteer(1);

      expect(result).toEqual({
        error: {
          message: "Unexpected error",
        },
        data: null,
        status: 500,
      });
    });

    it("should handle non-Error exceptions", async () => {
      (createClient as any).mockRejectedValue("String error");

      const result = await deleteVolunteer(1);

      expect(result).toEqual({
        error: {
          message: "An unexpected error occurred.",
        },
        data: null,
        status: 500,
      });
    });
  });
});
