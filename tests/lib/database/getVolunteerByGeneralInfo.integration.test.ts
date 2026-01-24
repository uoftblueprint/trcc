import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import { makeTestVolunteerInsert } from "../support/factories"; //**double check with this one */
import { filter_by_general_info } from "@/lib/api/getVolunteerByGeneralInfo";

describe("db: filter_by_general_info (integration)", () => {
  const client = createServiceTestClient();

  beforeEach(async () => {
    // Ensure data is cleaned up before testing
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
    // Insert test data
    const { error } = await client.from("Volunteers").insert([
      makeTestVolunteerInsert({
        name_org: "TEST_OR_A",
        email: "a@test.com",
      }),
      makeTestVolunteerInsert({
        name_org: "TEST_OR_B",
        email: "b@test.com",
      }),
      makeTestVolunteerInsert({
        name_org: "TEST_OR_C",
        email: "other@test.com",
      }),
    ]);

    if (error) {
      throw new Error(`Setup failed: ${error.message}`);
    }
  });

  afterEach(async () => {
    // Cleanup test data
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
  });

  it("returns volunteers matching ANY email (OR)", async () => {
    const result = await filter_by_general_info("OR", "email", [
      "a@test.com",
      "b@test.com",
    ]);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);

    const emails = result.data!.map((v) => v.email);
    expect(emails).toContain("a@test.com");
    expect(emails).toContain("b@test.com");
  });

  it("returns volunteer when AND matches single value", async () => {
    const result = await filter_by_general_info("AND", "email", ["a@test.com"]);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data![0].email).toBe("a@test.com");
  });
});
