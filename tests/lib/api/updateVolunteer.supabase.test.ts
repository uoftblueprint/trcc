import { afterAll, beforeAll, describe, expect, it } from "vitest";

const hasServiceRole = Boolean(
  process.env["SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"]
);
import { updateVolunteer } from "@/lib/api/updateVolunteer";
import type { Tables } from "@/lib/client/supabase/types";
import {
  createServiceTestClient,
  deleteWhere,
  deleteWhereGte,
} from "../support/helpers";
import {
  makeTestRoleInsert,
  makeTestVolunteerInsert,
  TEST_YEAR,
} from "../support/factories";

const client = createServiceTestClient();

async function cleanupTestData(): Promise<void> {
  await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
  await deleteWhere(client, "Roles", "name", "TEST_%");
  await deleteWhereGte(client, "Cohorts", "year", TEST_YEAR);
}

async function seedVolunteer(
  overrides: Partial<Tables<"Volunteers">> = {}
): Promise<Tables<"Volunteers">> {
  const insert = makeTestVolunteerInsert(overrides);
  const { data, error } = await client
    .from("Volunteers")
    .insert(insert)
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to seed volunteer");
  }

  return data;
}

async function seedRole(): Promise<Tables<"Roles">> {
  const insert = makeTestRoleInsert();
  const { data, error } = await client
    .from("Roles")
    .insert(insert)
    .select()
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to seed role");
  }

  return data;
}

describe.skipIf(!hasServiceRole)(
  "updateVolunteer (Supabase integration)",
  () => {
    beforeAll(async () => {
      await cleanupTestData();
    });

    afterAll(async () => {
      await cleanupTestData();
    });

    it("returns 400 for invalid volunteer id", async () => {
      const result = await updateVolunteer("bad-id", { name_org: "TEST_Name" });

      expect(result.status).toBe(400);
    });

    it("returns 400 for unknown body fields", async () => {
      const result = await updateVolunteer(1, { unexpected: "field" });

      expect(result.status).toBe(400);
    });

    it("returns 400 for invalid role type", async () => {
      const result = await updateVolunteer(1, {
        name_org: "TEST_Name",
        role: { name: "Advocate", type: "past" },
      });

      expect(result.status).toBe(400);
    });

    it("returns 400 for unknown cohort field", async () => {
      const result = await updateVolunteer(1, {
        cohort: { year: 2024, term: "Fall" },
      });

      expect(result.status).toBe(400);
      if (result.status === 400) {
        expect(result.body.error).toMatch(/Unknown field/);
      }
    });

    it("returns 400 for invalid position", async () => {
      const result = await updateVolunteer(1, { position: "admin" });

      expect(result.status).toBe(400);
    });

    it("updates volunteer fields and stamps updated_at", async () => {
      const volunteer = await seedVolunteer();

      const result = await updateVolunteer(volunteer.id, {
        name_org: "TEST_Updated Volunteer",
        phone: "555-1212",
      });

      expect(result.status).toBe(200);

      const { data: updated, error } = await client
        .from("Volunteers")
        .select("name_org, phone, updated_at")
        .eq("id", volunteer.id)
        .single();

      expect(error).toBeNull();
      expect(updated?.name_org).toBe("TEST_Updated Volunteer");
      expect(updated?.phone).toBe("555-1212");
      expect(updated?.updated_at).not.toBe(volunteer.updated_at);
    });

    it("updates role link when provided", async () => {
      const volunteer = await seedVolunteer();
      const role = await seedRole();

      const result = await updateVolunteer(volunteer.id, {
        name_org: volunteer.name_org,
        role: { name: role.name, type: role.type },
      });

      expect(result.status).toBe(200);

      const { data: roleLink, error: roleError } = await client
        .from("VolunteerRoles")
        .select("role_id")
        .eq("volunteer_id", volunteer.id)
        .maybeSingle();

      expect(roleError).toBeNull();
      expect(roleLink?.role_id).toBe(role.id);
    });

    it("returns 400 when role does not exist and does not update volunteer", async () => {
      const volunteer = await seedVolunteer();

      const result = await updateVolunteer(volunteer.id, {
        name_org: "TEST_Should Not Update",
        role: { name: "TEST_Missing Role", type: "current" },
      });

      expect(result.status).toBe(400);

      const { data: current, error } = await client
        .from("Volunteers")
        .select("name_org")
        .eq("id", volunteer.id)
        .single();

      expect(error).toBeNull();
      expect(current?.name_org).toBe(volunteer.name_org);
    });

    it("returns 400 when cohort field is sent and does not update volunteer", async () => {
      const volunteer = await seedVolunteer();

      const result = await updateVolunteer(volunteer.id, {
        name_org: "TEST_Should Not Update",
        cohort: { year: 2200, term: "fall" },
      });

      expect(result.status).toBe(400);

      const { data: current, error } = await client
        .from("Volunteers")
        .select("name_org")
        .eq("id", volunteer.id)
        .single();

      expect(error).toBeNull();
      expect(current?.name_org).toBe(volunteer.name_org);
    });
  }
);
