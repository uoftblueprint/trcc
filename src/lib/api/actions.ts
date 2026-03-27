"use server";

import { import_csv } from "./import_csv";
import {
  createVolunteer,
  type CreateVolunteerInput,
  type CreateVolunteerResponse,
} from "./createVolunteer";
import { updateVolunteer } from "./updateVolunteer";
import { updateUser } from "./updateUser";

type ImportCSVResponse = Awaited<ReturnType<typeof import_csv>>;
type UpdateVolunteerResponse = Awaited<ReturnType<typeof updateVolunteer>>;
type UpdateUserResponse = Awaited<ReturnType<typeof updateUser>>;

export async function importCsvAction(
  csvString: string
): Promise<ImportCSVResponse> {
  return import_csv(csvString);
}

export async function createVolunteerAction(
  input: CreateVolunteerInput
): Promise<CreateVolunteerResponse> {
  return createVolunteer(input);
}

export async function updateVolunteerAction(
  volunteerId: number,
  body: Record<string, unknown>
): Promise<UpdateVolunteerResponse> {
  return updateVolunteer(volunteerId, body);
}

export async function updateUserAction(
  userId: string,
  body: Record<string, unknown>
): Promise<UpdateUserResponse> {
  return updateUser(userId, body);
}
