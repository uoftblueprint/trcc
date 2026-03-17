import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { updateUser } from "@/lib/api/updateUser";
import {
  createAnonTestClient,
  createServiceRoleTestClient,
  createServiceTestClient,
  type DbClient,
} from "../support/helpers";

type UserRole = "admin" | "staff";

type SeededUser = {
  id: string;
  email: string;
  password: string;
  role: UserRole;
};

const TEST_EMAIL_PREFIX = "test_update_user_";
const DEFAULT_PASSWORD = "TEST_password_12345";
const UPDATED_PASSWORD = "TEST_updated_password_12345";

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

async function seedUser(role: UserRole = "staff"): Promise<SeededUser> {
  const email = uniqueTestEmail("seed");
  const password = DEFAULT_PASSWORD;

  const { data, error } = await anonClient.auth.signUp({
    email,
    password,
  });

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

  return {
    id: data.user.id,
    email,
    password,
    role,
  };
}

async function getAuthUser(userId: string): Promise<User> {
  const authAdminClient = createServiceRoleTestClient();
  const { data, error } = await authAdminClient.auth.admin.getUserById(userId);

  if (error || !data.user) {
    throw error ?? new Error("Failed to load auth user");
  }

  return data.user;
}

async function getPublicUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await dbClient
    .from("Users")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to load Users row");
  }

  return data.role as UserRole | null;
}

async function expectPersistedState(
  userId: string,
  expected: { email: string; role: UserRole }
): Promise<void> {
  const authUser = await getAuthUser(userId);
  const publicRole = await getPublicUserRole(userId);

  expect(authUser.email).toBe(expected.email);
  expect(publicRole).toBe(expected.role);
}

function getSupabaseDbContainerName(): string {
  const containers = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const container =
    containers.find((name) => name === "supabase_db_trcc") ??
    containers.find((name) => name.startsWith("supabase_db_"));

  if (!container) {
    throw new Error("Could not find the local Supabase DB container");
  }

  return container;
}

function getAuthEncryptedPassword(userId: string): string {
  // Query the local Supabase Postgres container directly so we can verify
  // the stored credential is a hash instead of the submitted plaintext.
  const sql = `select encrypted_password from auth.users where id = '${userId}'`;

  return execFileSync(
    "docker",
    [
      "exec",
      getSupabaseDbContainerName(),
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-c",
      sql,
    ],
    { encoding: "utf8" }
  ).trim();
}

function createIsolatedAnonClient(): DbClient {
  return createAnonTestClient();
}

describe("updateUser (integration)", () => {
  beforeAll(async () => {
    try {
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

  it("fails when updating a non-existent user", async () => {
    if (!authAdminAvailable) return;
    const result = await updateUser(randomUUID(), {
      email: uniqueTestEmail("missing"),
      role: "admin",
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeTruthy();
  });

  it("fails when updating to an existing email", async () => {
    if (!authAdminAvailable) return;
    const existingUser = await seedUser("staff");
    const userToUpdate = await seedUser("admin");

    const result = await updateUser(userToUpdate.id, {
      email: existingUser.email,
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeTruthy();
    await expectPersistedState(userToUpdate.id, {
      email: userToUpdate.email,
      role: userToUpdate.role,
    });
  });

  it("fails validation when fields use the wrong types", async () => {
    if (!authAdminAvailable) return;
    const user = await seedUser("staff");

    const result = await updateUser(user.id, {
      email: 123,
      password: ["bad"],
      role: false,
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBe("Invalid request body");
    if (!result.error) {
      throw new Error("Expected validation failure");
    }
    expect(result.validationErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "password" }),
        expect.objectContaining({ field: "role" }),
      ])
    );
    await expectPersistedState(user.id, {
      email: user.email,
      role: user.role,
    });
  });

  it("does not update either field when email is valid and role is invalid", async () => {
    if (!authAdminAvailable) return;
    const user = await seedUser("staff");
    const nextEmail = uniqueTestEmail("role_invalid");

    const result = await updateUser(user.id, {
      email: nextEmail,
      role: "superadmin",
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBe("Invalid request body");
    if (!result.error) {
      throw new Error("Expected validation failure");
    }
    expect(result.validationErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "role" })])
    );
    await expectPersistedState(user.id, {
      email: user.email,
      role: user.role,
    });
  });

  it("does not update either field when email is invalid and role is valid", async () => {
    if (!authAdminAvailable) return;
    const user = await seedUser("staff");

    const result = await updateUser(user.id, {
      email: "not-an-email",
      role: "admin",
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeTruthy();
    await expectPersistedState(user.id, {
      email: user.email,
      role: user.role,
    });
  });

  it("does not update either field when both email and role are invalid", async () => {
    if (!authAdminAvailable) return;
    const user = await seedUser("staff");

    const result = await updateUser(user.id, {
      email: "",
      role: "superadmin",
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBe("Invalid request body");
    if (!result.error) {
      throw new Error("Expected validation failure");
    }
    expect(result.validationErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "role" }),
      ])
    );
    await expectPersistedState(user.id, {
      email: user.email,
      role: user.role,
    });
  });

  it("updates both fields when email and role are valid", async () => {
    if (!authAdminAvailable) return;
    const user = await seedUser("staff");
    const nextEmail = uniqueTestEmail("both_valid");

    const result = await updateUser(user.id, {
      email: nextEmail,
      role: "admin",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      email: nextEmail,
      role: "admin",
    });
    await expectPersistedState(user.id, {
      email: nextEmail,
      role: "admin",
    });
  });

  it("stores a hashed password after update", async () => {
    if (!authAdminAvailable) return;
    const user = await seedUser("staff");
    const previousEncryptedPassword = getAuthEncryptedPassword(user.id);

    const result = await updateUser(user.id, {
      password: UPDATED_PASSWORD,
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ password: UPDATED_PASSWORD });

    const encryptedPassword = getAuthEncryptedPassword(user.id);
    expect(encryptedPassword).toBeTruthy();
    expect(encryptedPassword).not.toBe(previousEncryptedPassword);
    expect(encryptedPassword).not.toBe(UPDATED_PASSWORD);
    expect(encryptedPassword.length).toBeGreaterThan(20);
  });

  it("allows login with the new password after changing it", async () => {
    if (!authAdminAvailable) return;
    const user = await seedUser("staff");

    const updateResult = await updateUser(user.id, {
      password: UPDATED_PASSWORD,
    });

    expect(updateResult.error).toBeUndefined();

    const oldPasswordSignIn =
      await createIsolatedAnonClient().auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
    const newPasswordSignIn =
      await createIsolatedAnonClient().auth.signInWithPassword({
        email: user.email,
        password: UPDATED_PASSWORD,
      });

    expect(oldPasswordSignIn.error).toBeTruthy();
    expect(newPasswordSignIn.error).toBeNull();
    expect(newPasswordSignIn.data.user?.id).toBe(user.id);
  });
});
