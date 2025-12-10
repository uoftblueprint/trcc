import { beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
import { createTestClient, deleteAllFromTables } from "./helpers/supabase";

config();

beforeAll(async () => {
  const client = createTestClient();
  await deleteAllFromTables(client);
});

afterAll(async () => {
  const client = createTestClient();
  await deleteAllFromTables(client);
});
