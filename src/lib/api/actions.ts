"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/client/supabase/server";
import { import_csv } from "./import_csv";
import {
  createVolunteer,
  type CreateVolunteerInput,
  type CreateVolunteerResponse,
} from "./createVolunteer";
import {
  createUser,
  type CreateUserInput,
  type CreateUserResponse,
} from "./createUser";
import { deleteUser } from "./deleteUser";
import { removeVolunteer } from "./removeVolunteer";
import { updateUser } from "./updateUser";
import { getCurrentUserServer } from "./getCurrentUserServer";
import { updateCurrentUserAccount, type ValidationError } from "./updateUser";

type ImportCSVResponse = Awaited<ReturnType<typeof import_csv>>;

async function requireAdmin(): Promise<void> {
  const user = await getCurrentUserServer();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: admin access required");
  }
}

export async function importCsvAction(
  csvString: string
): Promise<ImportCSVResponse> {
  await requireAdmin();
  const result = await import_csv(csvString);
  if (result.summary.dbSucceeded > 0) {
    revalidatePath("/volunteers");
  }
  return result;
}

export async function createVolunteerAction(
  input: CreateVolunteerInput
): Promise<CreateVolunteerResponse> {
  await requireAdmin();
  const result = await createVolunteer(input);
  if (result.success) {
    revalidatePath("/volunteers");
  }
  return result;
}

export async function createUserAction(
  input: CreateUserInput
): Promise<CreateUserResponse> {
  await requireAdmin();
  const result = await createUser(input);
  if (result.success) {
    revalidatePath("/settings/manage");
  }
  return result;
}

export async function updateUserAction(
  userId: string,
  body: Record<string, unknown>
): Promise<{ data?: Record<string, unknown>; error?: string }> {
  await requireAdmin();
  const result = await updateUser(userId, body);
  if (result.error) {
    return { error: result.error };
  }
  revalidatePath("/settings/manage");
  return { data: result.data as Record<string, unknown> };
}

export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const result = await deleteUser(userId);
  if (result.success) {
    revalidatePath("/settings/manage");
  }
  return result;
}

export async function removeVolunteersAction(
  ids: number[]
): Promise<{ succeeded: number; failed: number; errors: string[] }> {
  await requireAdmin();
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of ids) {
    const result = await removeVolunteer(id);
    if (result.status === 200) {
      succeeded++;
    } else {
      failed++;
      errors.push(`ID ${id}: ${result.error?.message ?? "Unknown error"}`);
    }
  }

  if (succeeded > 0) {
    revalidatePath("/volunteers");
  }

  return { succeeded, failed, errors };
}

export type UpdateAccountSettingsPatch = {
  name: string;
  email: string;
  password?: string;
};

export type UpdateAccountSettingsResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      validationErrors?: ValidationError[];
    };

/**
 * Updates the signed-in user’s `Users` row and/or auth email & password using
 * the session client (no service role key).
 */
export async function updateAccountSettingsAction(
  patch: UpdateAccountSettingsPatch
): Promise<UpdateAccountSettingsResult> {
  const client = await createClient();

  const body: Record<string, string> = {
    name: patch.name.trim(),
    email: patch.email.trim(),
  };
  if (patch.password !== undefined) {
    const trimmedPassword = patch.password.trim();
    if (trimmedPassword !== "") {
      body["password"] = trimmedPassword;
    }
  }

  const result = await updateCurrentUserAccount(client, body);

  if ("error" in result && result.error) {
    const err: UpdateAccountSettingsResult = {
      ok: false,
      error: result.error,
    };
    if (result.validationErrors !== undefined) {
      err.validationErrors = result.validationErrors;
    }
    return err;
  }

  revalidatePath("/settings/account");
  return { ok: true };
}

export async function updateUserPasswordAction(
  userId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const result = await updateUser(userId, { password });

  if (result.error) {
    return { success: false, error: result.error };
  }

  return { success: true };
}
