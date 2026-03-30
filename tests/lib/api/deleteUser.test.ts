import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { deleteUser } from "@/lib/api/deleteUser";
import {
  createAnonTestClient,
  createServiceRoleTestClient,
  createServiceTestClient,
  type DbClient,
} from "../support/helpers";

const TEST_EMAIL_PREFIX = "test_delete_user_";
const DEFAULT_PASSWORD = "TEST_password_12345";

let authAdminAvailable = true;

const anonClient = createAnonTestClient();
const dbClient = createServiceTestClient();

function uniqueTestEmail(label: string): string {
  const token = `${label}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${TEST_EMAIL_PREFIX}${token}@example.com`;
}

function isAuthAdminUnavailableError(error: { message?: string }): boolean {
  const msg = error?.message ?? "";
  return (
    msg.includes("Bearer token") ||
    msg.includes("valid Bearer") ||
    msg.includes("invalid JWT") ||
    msg.includes("ES256")
  );
}

async function deleteTestUsers(): Promise<void> {
  if (!authAdminAvailable) return;
  let authAdminClient: DbClient;
  try {
    authAdminClient = createServiceRoleTestClient();
  } catch {
    authAdminAvailable = false;
    return;
  }

  const { data, error } = await authAdminClient.auth.admin.listUsers({
    perPage: 1000,
    page: 1,
  });

  if (error) {
    if (isAuthAdminUnavailableError(error)) {
      authAdminAvailable = false;
      return;
    }
    throw new Error(`Failed to list auth users for cleanup: ${error.message}`);
  }

  const users = data.users.filter((user) =>
    user.email?.startsWith(TEST_EMAIL_PREFIX)
  );

  if (users.length === 0) return;

  const userIds = users.map((user) => user.id);
  const { error: userTableError } = await dbClient
    .from("Users")
    .delete()
    .in("id", userIds);

  if (userTableError) {
    throw new Error(`Failed to clean Users rows: ${userTableError.message}`);
  }

  await Promise.all(
    users.map(async (user) => {
      const { error: deleteError } =
        await authAdminClient.auth.admin.deleteUser(user.id);

      if (deleteError) {
        throw new Error(`Failed to delete auth user: ${deleteError.message}`);
      }
    })
  );
}

type SeededUser = {
  id: string;
  email: string;
  password: string;
  role: "admin" | "staff";
};

async function seedUser(
  role: "admin" | "staff" = "staff"
): Promise<SeededUser> {
  const email = uniqueTestEmail("seed");
  const password = DEFAULT_PASSWORD;

  const { data, error } = await anonClient.auth.signUp({ email, password });

  if (error || !data.user) {
    throw error ?? new Error("Failed to seed auth user");
  }

  const { error: usersError } = await dbClient
    .from("Users")
    .upsert({ id: data.user.id, role }, { onConflict: "id" })
    .select("id")
    .single();

  if (usersError) {
    throw new Error(`Failed to seed Users row: ${usersError.message}`);
  }

  return { id: data.user.id, email, password, role };
}

describe("deleteUser", () => {
  // Validation tests (no DB needed)
  it("fails when userId is empty", async () => {
    const result = await deleteUser("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User ID is required");
    }
  });

  it("fails when userId is not a string", async () => {
    const result = await deleteUser(null as unknown as string);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("User ID is required");
    }
  });

  describe("integration (requires DB)", () => {
    let adminClient: DbClient;

    beforeAll(async () => {
      try {
        adminClient = createServiceRoleTestClient();
        await deleteTestUsers();
      } catch {
        authAdminAvailable = false;
      }
    });

    beforeEach(async () => {
      if (authAdminAvailable) await deleteTestUsers();
    });

    afterEach(async () => {
      if (authAdminAvailable) await deleteTestUsers();
    });

    it("deletes a user and removes both auth and Users row", async () => {
      if (!authAdminAvailable) return;
      const user = await seedUser("staff");

      const result = await deleteUser(user.id, adminClient);
      expect(result.success).toBe(true);

      // Verify public.Users row is gone
      const { data: userRow } = await dbClient
        .from("Users")
        .select("id")
        .eq("id", user.id)
        .single();
      expect(userRow).toBeNull();

      // Verify auth user is gone
      const { error: authError } = await adminClient.auth.admin.getUserById(
        user.id
      );
      expect(authError).toBeTruthy();
    });

    it("deleted user can no longer log in", async () => {
      if (!authAdminAvailable) return;
      const user = await seedUser("staff");

      const result = await deleteUser(user.id, adminClient);
      expect(result.success).toBe(true);

      const signInClient = createAnonTestClient();
      const { error: signInError } = await signInClient.auth.signInWithPassword(
        {
          email: user.email,
          password: user.password,
        }
      );
      expect(signInError).toBeTruthy();
    });

    it("deletes an admin user", async () => {
      if (!authAdminAvailable) return;
      const user = await seedUser("admin");

      const result = await deleteUser(user.id, adminClient);
      expect(result.success).toBe(true);

      const { data: userRow } = await dbClient
        .from("Users")
        .select("id")
        .eq("id", user.id)
        .single();
      expect(userRow).toBeNull();
    });

    it("handles deleting a non-existent user gracefully", async () => {
      if (!authAdminAvailable) return;
      const fakeId = randomUUID();

      // Should not crash — the Users delete succeeds (0 rows affected) and the auth delete may error
      const result = await deleteUser(fakeId, adminClient);
      // The auth.admin.deleteUser for a non-existent user returns an error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it("does not affect other users when deleting one", async () => {
      if (!authAdminAvailable) return;
      const userA = await seedUser("staff");
      const userB = await seedUser("admin");

      const result = await deleteUser(userA.id, adminClient);
      expect(result.success).toBe(true);

      // userB should still exist
      const { data: userBRow } = await dbClient
        .from("Users")
        .select("id, role")
        .eq("id", userB.id)
        .single();
      expect(userBRow).toBeTruthy();
      expect(userBRow!.role).toBe("admin");

      // userB should still be able to log in
      const signInClient = createAnonTestClient();
      const { error: signInError } = await signInClient.auth.signInWithPassword(
        {
          email: userB.email,
          password: userB.password,
        }
      );
      expect(signInError).toBeNull();
    });
  });
});
