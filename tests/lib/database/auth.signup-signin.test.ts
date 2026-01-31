import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createAnonTestClient,
  createServiceTestClient,
} from "../support/helpers";

async function deleteTestUsers(): Promise<void> {
  const adminClient = createServiceTestClient();
  const { data, error } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
    page: 1,
  });

  if (error) {
    throw new Error(`Failed to list auth users for cleanup: ${error.message}`);
  }

  const users = data.users.filter((user) => user.email?.startsWith("test_"));

  await Promise.all(
    users.map((user) => adminClient.auth.admin.deleteUser(user.id))
  );
}

describe("db: Auth sign-up/sign-in (integration)", () => {
  const anonClient = createAnonTestClient();

  beforeEach(async () => {
    await deleteTestUsers();
  });

  afterEach(async () => {
    await deleteTestUsers();
  });

  it("signs up a user with email/password", async () => {
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
