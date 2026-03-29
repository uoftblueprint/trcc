"use server";

import { revalidatePath } from "next/cache";
import { import_csv } from "./import_csv";
import {
  createVolunteer,
  type CreateVolunteerInput,
  type CreateVolunteerResponse,
} from "./createVolunteer";
import { getCurrentUserServer } from "./getCurrentUserServer";

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
