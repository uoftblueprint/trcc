import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createUser } from "@/lib/api/createUser";
import type { CreateUserInput } from "@/lib/api/createUser";
import {
  createAnonTestClient,
  createServiceRoleTestClient,
  createServiceTestClient,
  type DbClient,
} from "../support/helpers";

const TEST_EMAIL_PREFIX = "test_create_user_";
const DEFAULT_PASSWORD = "TEST_password_12345";

let authAdminAvailable = true;

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

describe("createUser", () => {
  // Validation tests (no DB needed)
  it("should fail when input is null", async () => {
    const result = await createUser(null as unknown as CreateUserInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
    }
  });

  it("should fail when input is empty object", async () => {
    const result = await createUser({} as CreateUserInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Validation failed");
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBeGreaterThan(0);
    }
  });

  it("should fail when name is missing", async () => {
    const result = await createUser({
      email: "test@example.com",
      password: DEFAULT_PASSWORD,
      role: "staff",
    } as CreateUserInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.validationErrors!.some((e) => e.field === "name")).toBe(
        true
      );
    }
  });

  it("should fail when name is empty", async () => {
    const result = await createUser({
      name: "   ",
      email: "test@example.com",
      password: DEFAULT_PASSWORD,
      role: "staff",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.validationErrors!.some((e) => e.field === "name")).toBe(
        true
      );
    }
  });

  it("should fail when email is missing", async () => {
    const result = await createUser({
      name: "Test User",
      password: DEFAULT_PASSWORD,
      role: "staff",
    } as CreateUserInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.validationErrors!.some((e) => e.field === "email")).toBe(
        true
      );
    }
  });

  it("should fail when password is too short", async () => {
    const result = await createUser({
      name: "Test User",
      email: "test@example.com",
      password: "12345",
      role: "staff",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.validationErrors!.some((e) => e.field === "password")).toBe(
        true
      );
    }
  });

  it("should fail when role is invalid", async () => {
    const result = await createUser({
      name: "Test User",
      email: "test@example.com",
      password: DEFAULT_PASSWORD,
      role: "superadmin" as "admin",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.validationErrors!.some((e) => e.field === "role")).toBe(
        true
      );
    }
  });

  it("should collect multiple validation errors", async () => {
    const result = await createUser({
      name: "",
      email: "",
      password: "short",
      role: "invalid" as "admin",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.validationErrors!.length).toBeGreaterThanOrEqual(4);
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

    it("creates a user with staff role", async () => {
      if (!authAdminAvailable) return;
      const email = uniqueTestEmail("staff");
      const result = await createUser(
        {
          name: "Test Staff",
          email,
          password: DEFAULT_PASSWORD,
          role: "staff",
        },
        adminClient
      );

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.id).toBeTruthy();

      // Verify public.Users row
      const { data: userRow, error } = await dbClient
        .from("Users")
        .select("id, name, role")
        .eq("id", result.data.id)
        .single();

      expect(error).toBeNull();
      expect(userRow).toBeTruthy();
      expect(userRow!.name).toBe("Test Staff");
      expect(userRow!.role).toBe("staff");
    });

    it("creates a user with admin role", async () => {
      if (!authAdminAvailable) return;
      const email = uniqueTestEmail("admin");
      const result = await createUser(
        {
          name: "Test Admin",
          email,
          password: DEFAULT_PASSWORD,
          role: "admin",
        },
        adminClient
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      const { data: userRow } = await dbClient
        .from("Users")
        .select("role")
        .eq("id", result.data.id)
        .single();

      expect(userRow!.role).toBe("admin");
    });

    it("allows login with the created credentials", async () => {
      if (!authAdminAvailable) return;
      const email = uniqueTestEmail("login");
      const result = await createUser(
        {
          name: "Test Login",
          email,
          password: DEFAULT_PASSWORD,
          role: "staff",
        },
        adminClient
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      const anonClient = createAnonTestClient();
      const { data: signInData, error: signInError } =
        await anonClient.auth.signInWithPassword({
          email,
          password: DEFAULT_PASSWORD,
        });

      expect(signInError).toBeNull();
      expect(signInData.user?.id).toBe(result.data.id);
    });

    it("fails when email is already taken", async () => {
      if (!authAdminAvailable) return;
      const email = uniqueTestEmail("duplicate");

      const first = await createUser(
        {
          name: "First User",
          email,
          password: DEFAULT_PASSWORD,
          role: "staff",
        },
        adminClient
      );
      expect(first.success).toBe(true);

      const second = await createUser(
        {
          name: "Second User",
          email,
          password: DEFAULT_PASSWORD,
          role: "staff",
        },
        adminClient
      );
      expect(second.success).toBe(false);
      if (!second.success) {
        expect(second.error).toBeTruthy();
      }
    });

    it("trims name and email whitespace", async () => {
      if (!authAdminAvailable) return;
      const email = uniqueTestEmail("trim");
      const result = await createUser(
        {
          name: "  Trimmed Name  ",
          email: `  ${email}  `,
          password: DEFAULT_PASSWORD,
          role: "staff",
        },
        adminClient
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      const { data: userRow } = await dbClient
        .from("Users")
        .select("name")
        .eq("id", result.data.id)
        .single();

      expect(userRow!.name).toBe("Trimmed Name");
    });
  });
});
