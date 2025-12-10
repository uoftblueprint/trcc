import { describe, it, expect } from "vitest";
import {
  createTestClient,
  createTestVolunteer,
  deleteAllFromTables,
} from "../../helpers";

describe("getExample - Integration Tests", () => {
  const client = createTestClient();

  it("should fetch volunteers from the database", async () => {
    await deleteAllFromTables(client);

    const volunteer1 = await createTestVolunteer(client, {
      name_org: "Test Volunteer 1",
      email: "volunteer1@test.com",
    });

    const volunteer2 = await createTestVolunteer(client, {
      name_org: "Test Volunteer 2",
      email: "volunteer2@test.com",
    });

    const { data, error } = await client.from("Volunteers").select();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBeGreaterThanOrEqual(2);
    expect(data?.some((v: { id: number }) => v.id === volunteer1.id)).toBe(
      true
    );
    expect(data?.some((v: { id: number }) => v.id === volunteer2.id)).toBe(
      true
    );
  });

  it("should return empty array when no volunteers exist", async () => {
    await deleteAllFromTables(client);

    const { data, error } = await client.from("Volunteers").select();

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
