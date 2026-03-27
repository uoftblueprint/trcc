"use server";

import { import_csv } from "./import_csv";
import {
  createVolunteer,
  type CreateVolunteerInput,
  type CreateVolunteerResponse,
} from "./createVolunteer";

type ImportCSVResponse = Awaited<ReturnType<typeof import_csv>>;

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
