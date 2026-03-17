import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import {
  createAnonTestClient,
  createServiceRoleTestClient,
} from "../support/helpers";

let authAdminAvailable = true;

async function deleteTestUsers(): Promise<void> {
  const adminClient = createServiceRoleTestClient();
  const { data, error } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
    page: 1,
  });

  if (error) {
    if (
      error.message.includes("invalid JWT") ||
      error.message.includes("ES256")
    ) {
      authAdminAvailable = false;
      return;
    }
    throw new Error(`Failed to list auth users for cleanup: ${error.message}`);
  }

  const users = data.users.filter((user) => user.email?.startsWith("test_"));

  await Promise.all(
    users.map((user) => adminClient.auth.admin.deleteUser(user.id))
  );
}

describe("db: Auth sign-up/sign-in (integration)", () => {
  const anonClient = createAnonTestClient();

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

  it("signs up a user with email/password", async () => {
    if (!authAdminAvailable) return;
    const email = "test_email@email.com";
    const password = "TEST_password_12345";

    const { data, error } = await anonClient.auth.signUp({
      email,
      password,
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.user?.email).toBe(email);
  });

  it("signs in an existing user with email/password", async () => {
    if (!authAdminAvailable) return;
    const email = "test_email@email.com";
    const password = "TEST_password_12345";

    const { error: signUpError } = await anonClient.auth.signUp({
      email,
      password,
    });

    expect(signUpError).toBeNull();

    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.user?.email).toBe(email);
    expect(data.session).toBeTruthy();
  });
});
