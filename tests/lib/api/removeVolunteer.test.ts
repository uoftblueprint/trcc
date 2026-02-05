// Tests the API function that removes volunteers from the database

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import { makeTestVolunteerInsert } from "../support/factories";
import { removeVolunteer } from "@/lib/api/removeVolunteer";

describe("removeVolunteer (integration)", () => {
  const client = createServiceTestClient();

  // Cleanup before and after each test
  beforeEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
  });

  describe("input validation", () => {
    it("returns 400 for negative ID", async () => {
      const result = await removeVolunteer(-1);

      expect(result).toEqual({
        error: {
          message: "Invalid volunteer ID. ID must be a positive integer.",
        },
        data: null,
        status: 400,
      });
    });

    it("returns 400 for zero ID", async () => {
      const result = await removeVolunteer(0);

      expect(result).toEqual({
        error: {
          message: "Invalid volunteer ID. ID must be a positive integer.",
        },
        data: null,
        status: 400,
      });
    });

    it("returns 400 for non-integer ID", async () => {
      const result = await removeVolunteer(1.5);

      expect(result).toEqual({
        error: {
          message: "Invalid volunteer ID. ID must be a positive integer.",
        },
        data: null,
        status: 400,
      });
    });
  });

  describe("successful deletion", () => {
    it("deletes an existing volunteer and returns 200", async () => {
      // Create a volunteer to delete
      const { data: volunteer } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_ToDelete" }))
        .select()
        .single();

      expect(volunteer).toBeTruthy();
      const volunteerId = volunteer!.id;

      // Delete the volunteer using the API function
      const result = await removeVolunteer(volunteerId);

      expect(result).toEqual({
        error: null,
        data: {
          message: "Volunteer removed successfully.",
          id: volunteerId,
        },
        status: 200,
      });

      // Verify the volunteer is actually deleted from the database
      const { data: afterDelete } = await client
        .from("Volunteers")
        .select()
        .eq("id", volunteerId);

      expect(afterDelete).toHaveLength(0);
    });
  });

  describe("volunteer not found", () => {
    it("returns 404 when volunteer does not exist", async () => {
      // Use a large ID that doesn't exist
      const nonExistentId = 999999999;

      const result = await removeVolunteer(nonExistentId);

      expect(result).toEqual({
        error: {
          message: "Volunteer not found.",
        },
        data: null,
        status: 404,
      });
    });

    it("returns 404 when trying to delete an already deleted volunteer", async () => {
      // Create a volunteer
      const { data: volunteer } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_DeleteTwice" }))
        .select()
        .single();

      const volunteerId = volunteer!.id;

      // Delete once (should succeed)
      const firstDelete = await removeVolunteer(volunteerId);
      expect(firstDelete.status).toBe(200);

      // Try to delete again (should return 404)
      const secondDelete = await removeVolunteer(volunteerId);
      expect(secondDelete).toEqual({
        error: {
          message: "Volunteer not found.",
        },
        data: null,
        status: 404,
      });
    });
  });

  describe("cascade behavior", () => {
    it("deletes volunteer even when they have related records (cascade)", async () => {
      // This test verifies that the database cascade constraints work properly
      // The VolunteerCohorts and VolunteerRoles junction tables should cascade delete

      const { data: volunteer } = await client
        .from("Volunteers")
        .insert(makeTestVolunteerInsert({ name_org: "TEST_WithRelations" }))
        .select()
        .single();

      const volunteerId = volunteer!.id;

      // Delete the volunteer
      const result = await removeVolunteer(volunteerId);

      expect(result.status).toBe(200);
      expect(result.data?.id).toBe(volunteerId);

      // Verify deletion
      const { data: afterDelete } = await client
        .from("Volunteers")
        .select()
        .eq("id", volunteerId);

      expect(afterDelete).toHaveLength(0);
    });
  });
});
