"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/client/supabase/server";
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
import { removeUser } from "./removeUser";
import { updateUser } from "./updateUser";
import { getCurrentUserServer } from "./getCurrentUserServer";
import { updateCurrentUserAccount, type ValidationError } from "./updateUser";
import { createRole } from "./createRole";
import { createCohort } from "./createCohort";
import { updateRole } from "./updateRole";
import { updateCohort } from "./updateCohort";
import { removeRoleById } from "./removeRole";
import { removeCohort } from "./removeCohort";
import {
  createCustomColumnsBatch,
  deleteCustomColumnsBatch,
  listCustomColumns,
  updateCustomColumn,
  type ColumnMutationResult,
  type CustomColumnRow,
  type CustomColumnUpdate,
  type NewCustomColumnInput,
} from "./customColumns";
import {
  getColumnPreferencesForUser,
  saveColumnPreferencesForUser,
  resolveStaffColumnPreferences,
} from "./columnPreferences";
import { tableIdForCustomColumn } from "@/lib/volunteerTable/columnOrder";
import {
  getVolunteerTableGlobalSettings,
  saveVolunteerTableGlobalSettings,
} from "./volunteerTableGlobalSettings";

type ImportCSVResponse = Awaited<ReturnType<typeof import_csv>>;

async function requireAdmin(): Promise<void> {
  const user = await getCurrentUserServer();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: admin access required");
  }
}

async function requireAuthenticatedUserId(): Promise<string> {
  const user = await getCurrentUserServer();
  if (!user) {
    throw new Error("Unauthorized: sign in required");
  }
  return user.id;
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

export async function updateUserAction(
  userId: string,
  patch: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const result = await updateUser(userId, patch);

  if (result.error) {
    return { success: false, error: result.error };
  }

  revalidatePath("/settings/manage");
  return { success: true };
}

export async function removeUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const currentUser = await getCurrentUserServer();
  if (currentUser?.id === userId) {
    return { success: false, error: "You cannot remove your own account." };
  }

  const result = await removeUser(userId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/settings/manage");
  return { success: true };
}

function revalidateVolunteerTags(): void {
  revalidatePath("/volunteers");
}

export async function createRoleTagAction(input: {
  name: string;
  type: string;
  is_active?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const res = await createRole({
    name: input.name.trim(),
    type: input.type.trim(),
    is_active: input.is_active ?? true,
  });
  if (!res.success) {
    return { success: false, error: res.error };
  }
  revalidateVolunteerTags();
  return { success: true };
}

export async function updateRoleTagAction(
  roleId: number,
  body: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const res = await updateRole(roleId, body);
  if (res.status !== 200) {
    return { success: false, error: res.body.error };
  }
  revalidateVolunteerTags();
  return { success: true };
}

export async function removeRoleTagAction(
  roleId: number
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const res = await removeRoleById(roleId);
  if (!res.success) {
    return { success: false, error: res.error };
  }
  revalidateVolunteerTags();
  return { success: true };
}

export async function createCohortTagAction(input: {
  term: string;
  year: number;
  is_active?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  try {
    await createCohort({
      term: input.term,
      year: input.year,
      is_active: input.is_active ?? true,
    });
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create cohort",
    };
  }
  revalidateVolunteerTags();
  return { success: true };
}

export async function updateCohortTagAction(
  cohortId: number,
  body: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const res = await updateCohort(cohortId, body);
  if (res.status !== 200) {
    return { success: false, error: res.body.error };
  }
  revalidateVolunteerTags();
  return { success: true };
}

export async function removeCohortTagAction(
  year: number,
  term: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const res = await removeCohort(year, term);
  if (!res.success) {
    return { success: false, error: res.error };
  }
  revalidateVolunteerTags();
  return { success: true };
}

export async function removeAllRoleTagsAction(): Promise<
  { success: true; removed: number } | { success: false; error: string }
> {
  await requireAdmin();
  const client = createAdminClient();
  const { data: rows, error } = await client.from("Roles").select("id");
  if (error) {
    return { success: false, error: error.message };
  }
  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length === 0) {
    return { success: true, removed: 0 };
  }
  const { error: delErr } = await client.from("Roles").delete().in("id", ids);
  if (delErr) {
    return { success: false, error: delErr.message };
  }
  revalidateVolunteerTags();
  return { success: true, removed: ids.length };
}

export async function removeAllCohortTagsAction(): Promise<
  { success: true; removed: number } | { success: false; error: string }
> {
  await requireAdmin();
  const client = createAdminClient();
  const { data: rows, error } = await client.from("Cohorts").select("id");
  if (error) {
    return { success: false, error: error.message };
  }
  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length === 0) {
    return { success: true, removed: 0 };
  }
  const { error: delErr } = await client.from("Cohorts").delete().in("id", ids);
  if (delErr) {
    return { success: false, error: delErr.message };
  }
  revalidateVolunteerTags();
  return { success: true, removed: ids.length };
}

export async function getCustomColumnsAction(): Promise<CustomColumnRow[]> {
  await requireAuthenticatedUserId();
  const cols = await listCustomColumns();
  const user = await getCurrentUserServer();
  if (user?.role === "admin") return cols;
  const global = await getVolunteerTableGlobalSettings();
  const hiddenSet = new Set(global.admin_hidden_columns);
  return cols.filter(
    (c) => !hiddenSet.has(tableIdForCustomColumn(c.column_key))
  );
}

export async function createCustomColumnsAction(
  columns: NewCustomColumnInput[]
): Promise<ColumnMutationResult[]> {
  await requireAdmin();
  const u = await getCurrentUserServer();
  const results = await createCustomColumnsBatch(columns, u?.id ?? null);
  if (results.some((r) => r.success)) {
    revalidatePath("/volunteers");
  }
  return results;
}

export async function deleteCustomColumnsAction(
  columnIds: number[]
): Promise<ColumnMutationResult[]> {
  await requireAdmin();
  const results = await deleteCustomColumnsBatch(columnIds);
  if (results.some((r) => r.success)) {
    revalidatePath("/volunteers");
    revalidatePath("/settings/table");
  }
  return results;
}

export async function updateCustomColumnAction(
  columnId: number,
  patch: CustomColumnUpdate
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const res = await updateCustomColumn(columnId, patch);
  if (res.success) {
    revalidatePath("/volunteers");
  }
  return res;
}

export async function getColumnPreferencesAction(): Promise<{
  column_order: string[];
  hidden_columns: string[];
  prefs_updated_at: string | null;
  /** Staff only: merged hidden for rendering; admins merge client-side with global settings. */
  hidden_columns_effective?: string[];
}> {
  const userId = await requireAuthenticatedUserId();
  const user = await getCurrentUserServer();
  const prefs = await getColumnPreferencesForUser(userId);
  if (user?.role === "admin") {
    return prefs;
  }
  return resolveStaffColumnPreferences(prefs);
}

export async function saveColumnPreferencesAction(
  column_order: string[],
  hidden_columns: string[]
): Promise<{ success: boolean; error?: string }> {
  const userId = await requireAuthenticatedUserId();
  const user = await getCurrentUserServer();
  let co = column_order;
  let hc = hidden_columns;
  if (user?.role !== "admin") {
    const global = await getVolunteerTableGlobalSettings();
    const globalSet = new Set(global.admin_hidden_columns);
    hc = hidden_columns.filter((id) => !globalSet.has(id));
    co = column_order.filter((id) => !globalSet.has(id));
  }
  const res = await saveColumnPreferencesForUser(userId, co, hc);
  if (res.success) {
    revalidatePath("/volunteers");
  }
  return res;
}

export async function getVolunteerTableGlobalSettingsAction(): Promise<{
  admin_hidden_columns: string[];
}> {
  await requireAuthenticatedUserId();
  const user = await getCurrentUserServer();
  if (user?.role !== "admin") {
    return { admin_hidden_columns: [] };
  }
  return getVolunteerTableGlobalSettings();
}

export async function saveVolunteerTableGlobalSettingsAction(
  admin_hidden_columns: string[]
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const res = await saveVolunteerTableGlobalSettings(admin_hidden_columns);
  if (res.success) {
    revalidatePath("/volunteers");
    revalidatePath("/settings/table");
  }
  return res;
}
