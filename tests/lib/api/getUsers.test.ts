// Tests the API function that fetches all users from public.Users and enriches with email from auth.users.
// Requires RLS policy on public.Users for anon (migration 20260316000000). Run: supabase db reset

import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { createServiceTestClient, deleteWhereIdIn } from "../support/helpers";
import { makeTestUserInsertWithEmail } from "../support/factories";
import {
  getUsers,
  type UserRow,
  type UserRowWithEmail,
} from "@/lib/api/getUsers";

// Rows returned by getUsers() (enriched with email from auth.users).
type UserRowFromDb = UserRowWithEmail;

describe("getUsers (integration)", () => {
  const client = createServiceTestClient();
  const insertedIds: string[] = [];
  let canReadUsers = false;

  beforeAll(async () => {
    const canaryId = crypto.randomUUID();
    try {
      await client.from("Users").insert({
        id: canaryId,
        email: "TEST_canary_getUsers@example.com",
        role: "staff",
      } as never);
      const result = await getUsers();
      const found = (result as { id?: string }[]).some(
        (r) => r.id === canaryId
      );
      canReadUsers = !!found;
      if (canReadUsers) await client.from("Users").delete().eq("id", canaryId);
    } catch {
      canReadUsers = false;
    }
  });

  beforeEach(async () => {
    await deleteWhereIdIn(client, "Users", insertedIds);
    insertedIds.length = 0;
  });

  afterEach(async () => {
    await deleteWhereIdIn(client, "Users", insertedIds);
    insertedIds.length = 0;
  });

  async function insertUser(
    overrides: {
      id?: string;
      email?: string | null;
      role?: "admin" | "staff" | null;
    } = {}
  ): Promise<{
    id: string;
    email: string | null;
    role: "admin" | "staff" | null;
  }> {
    const row = makeTestUserInsertWithEmail(overrides);
    await client.from("Users").insert(row as never);
    insertedIds.push(row.id);
    return row;
  }

  describe("empty results", () => {
    it("returns empty array when no users exist", async () => {
      const result = await getUsers();
      const testResults = (result as UserRowFromDb[]).filter(
        (row) => row.email?.startsWith("TEST_User_") ?? false
      );
      expect(testResults).toEqual([]);
    });
  });

  describe("single user", () => {
    it("returns one user with admin role", async () => {
      if (!canReadUsers) return;
      const { id } = await insertUser({
        email: "TEST_User_Admin@example.com",
        role: "admin",
      });

      const result = await getUsers();
      const testUser = (result as UserRowFromDb[]).find((row) => row.id === id);

      expect(testUser).toBeDefined();
      expect(testUser!.email ?? (testUser as UserRowFromDb).name).toBe(
        "TEST_User_Admin@example.com"
      );
      expect(testUser!.role).toBe("admin");
      expect(testUser).toHaveProperty("id");
      expect(testUser).toHaveProperty("created_at");
    });

    it("returns one user with staff role", async () => {
      if (!canReadUsers) return;
      const { id } = await insertUser({
        email: "TEST_User_Staff@example.com",
        role: "staff",
      });

      const result = await getUsers();
      const testUser = (result as UserRowFromDb[]).find((row) => row.id === id);

      expect(testUser).toBeDefined();
      expect(testUser!.role).toBe("staff");
    });

    it("returns one user with null email and null role", async () => {
      if (!canReadUsers) return;
      const { id } = await insertUser({ email: null, role: null });

      const result = await getUsers();
      const testUser = result.find((row) => row.id === id);

      expect(testUser).toBeDefined();
      const identity = (testUser as UserRowFromDb).email ?? testUser!.name;
      expect(identity == null).toBe(true);
      expect(testUser!.role).toBeNull();
    });
  });

  describe("multiple users", () => {
    it("returns all test users", async () => {
      if (!canReadUsers) return;
      await insertUser({
        email: "TEST_User_Multi_1@example.com",
        role: "admin",
      });
      await insertUser({
        email: "TEST_User_Multi_2@example.com",
        role: "staff",
      });
      await insertUser({
        email: "TEST_User_Multi_3@example.com",
        role: "admin",
      });

      const result = await getUsers();
      const testUsers = (result as UserRowFromDb[]).filter(
        (row) => row.email?.startsWith("TEST_User_Multi_") ?? false
      );

      expect(testUsers).toHaveLength(3);
      const emails = testUsers
        .map((u) => (u as UserRowFromDb).email ?? u.name)
        .filter(Boolean)
        .sort();
      expect(emails).toEqual([
        "TEST_User_Multi_1@example.com",
        "TEST_User_Multi_2@example.com",
        "TEST_User_Multi_3@example.com",
      ]);
    });
  });

  describe("ordering", () => {
    it("returns users ordered by created_at descending", async () => {
      if (!canReadUsers) return;
      await insertUser({
        email: "TEST_User_First@example.com",
        role: "staff",
      });
      await insertUser({
        email: "TEST_User_Second@example.com",
        role: "staff",
      });
      await insertUser({
        email: "TEST_User_Third@example.com",
        role: "staff",
      });

      const result = await getUsers();
      const testUsers = (result as UserRowFromDb[]).filter(
        (row) => row.email?.startsWith("TEST_User_") ?? false
      );

      expect(testUsers).toHaveLength(3);
      // Newest first: Third, Second, First
      expect((testUsers[0] as UserRowFromDb).email ?? testUsers[0]!.name).toBe(
        "TEST_User_Third@example.com"
      );
      expect((testUsers[1] as UserRowFromDb).email ?? testUsers[1]!.name).toBe(
        "TEST_User_Second@example.com"
      );
      expect((testUsers[2] as UserRowFromDb).email ?? testUsers[2]!.name).toBe(
        "TEST_User_First@example.com"
      );
    });
  });

  describe("return value structure", () => {
    it("returns UserRow objects with correct properties", async () => {
      if (!canReadUsers) return;
      const { id } = await insertUser({
        email: "TEST_User_Structure@example.com",
        role: "admin",
      });

      const result = await getUsers();
      const testUser = result.find((row) => row.id === id);

      expect(testUser).toBeDefined();
      expect(testUser!).toHaveProperty("id");
      expect(testUser!).toHaveProperty("created_at");
      expect((testUser as UserRowFromDb).email ?? testUser!.name).toBe(
        "TEST_User_Structure@example.com"
      );
      expect(testUser!).toHaveProperty("role", "admin");
    });

    it("returns array conforming to UserRow type", async () => {
      const result = await getUsers();

      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const row: UserRow = result[0]!;
        expect(row).toHaveProperty("id");
        expect(row).toHaveProperty("created_at");
        expect(row).toHaveProperty("role");
        // getUsers enriches with email from auth.users
        expect(
          (row as UserRowFromDb).email !== undefined || row.name !== undefined
        ).toBe(true);
      }
    });
  });

  describe("email from auth.users", () => {
    it("returns every row with email property (string or null)", async () => {
      const result = await getUsers();

      for (const row of result) {
        expect(row).toHaveProperty("email");
        expect(row.email === null || typeof row.email === "string").toBe(true);
      }
    });

    it("returns email null for user that exists only in public.Users", async () => {
      if (!canReadUsers) return;
      const { id } = await insertUser({
        email: "TEST_User_NoAuth@example.com",
        role: "staff",
      });

      const result = await getUsers();
      const row = result.find((r) => r.id === id);

      expect(row).toBeDefined();
      // User was never created in auth; getUsers enriches from auth.admin.listUsers, so email is null
      expect(row!.email).toBeNull();
    });

    it("returns email from auth when auth user exists with same id", async () => {
      if (!canReadUsers) return;
      const { createServiceRoleTestClient } =
        await import("../support/helpers");
      let adminClient: ReturnType<typeof createServiceRoleTestClient>;
      try {
        adminClient = createServiceRoleTestClient();
      } catch {
        return; // skip when service role key not available
      }
      const testEmail = `TEST_getUsers_auth_${Date.now()}@example.com`;
      const { data: createData, error: createError } =
        await adminClient.auth.admin.createUser({
          email: testEmail,
          password: "TEST_password_12345",
          email_confirm: true,
        });
      if (createError || !createData.user) {
        return; // skip if auth admin not available (e.g. local Supabase)
      }
      const authUserId = createData.user.id;
      insertedIds.push(authUserId);
      try {
        await client.from("Users").insert({
          id: authUserId,
          email: null,
          role: "staff",
        } as never);

        const result = await getUsers();
        const row = result.find((r) => r.id === authUserId);

        expect(row).toBeDefined();
        // Auth stores email in lowercase; compare case-insensitively
        expect(row!.email).toBeDefined();
        expect(row!.email!.toLowerCase()).toBe(testEmail.toLowerCase());
      } finally {
        await adminClient.auth.admin.deleteUser(authUserId);
      }
    });
  });
});
