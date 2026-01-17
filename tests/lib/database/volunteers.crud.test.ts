import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServiceTestClient, deleteWhere } from "../support/helpers";
import { makeTestVolunteerInsert } from "../support/factories";

describe("db: Volunteers CRUD (integration)", () => {
  const client = createServiceTestClient();

  beforeEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
  });

  it("creates, reads, updates, and deletes a Volunteer row", async () => {
    // CREATE
    const insert = makeTestVolunteerInsert();
    const { data: created, error: createError } = await client
      .from("Volunteers")
      .insert(insert)
      .select()
      .single();

    expect(createError).toBeNull();
    expect(created).toBeTruthy();
    expect(created!.name_org).toBe(insert.name_org);
    expect(created!.email).toBe(insert.email);
    expect(created!.pseudonym).toBe(insert.pseudonym);

    const id = created!.id;

    // READ
    const { data: fetched, error: readError } = await client
      .from("Volunteers")
      .select()
      .eq("id", id)
      .single();

    expect(readError).toBeNull();
    expect(fetched!.id).toBe(id);
    expect(fetched!.name_org).toBe(insert.name_org);

    // UPDATE
    const newPosition = "staff";
    const { data: updated, error: updateError } = await client
      .from("Volunteers")
      .update({ position: newPosition, opt_in_communication: false })
      .eq("id", id)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updated!.id).toBe(id);
    expect(updated!.position).toBe(newPosition);
    expect(updated!.opt_in_communication).toBe(false);

    // DELETE
    const { error: deleteError } = await client
      .from("Volunteers")
      .delete()
      .eq("id", id);
    expect(deleteError).toBeNull();

    // Confirm data is deleted
    const { data: afterDelete, error: afterDeleteError } = await client
      .from("Volunteers")
      .select()
      .eq("id", id);

    expect(afterDeleteError).toBeNull();
    expect(afterDelete).toHaveLength(0);
  });

  it("handles nullable fields correctly", async () => {
    const insert = makeTestVolunteerInsert({
      pseudonym: null,
      pronouns: null,
      phone: null,
      notes: null,
    });

    const { data: created, error } = await client
      .from("Volunteers")
      .insert(insert)
      .select()
      .single();

    expect(error).toBeNull();
    expect(created!.pseudonym).toBeNull();
    expect(created!.pronouns).toBeNull();
    expect(created!.phone).toBeNull();
    expect(created!.notes).toBeNull();
  });

  it("can query volunteers by email", async () => {
    const insert = makeTestVolunteerInsert({
      email: "test_unique_query@example.com",
    });

    await client.from("Volunteers").insert(insert);

    const { data, error } = await client
      .from("Volunteers")
      .select()
      .eq("email", "test_unique_query@example.com");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]?.name_org).toBe(insert.name_org);
  });

  it("can filter volunteers by opt_in_communication", async () => {
    // Use unique prefix to avoid cleanup conflicts
    const uniquePrefix = `TEST_optin_${Date.now()}`;

    const optIn = makeTestVolunteerInsert({
      name_org: `${uniquePrefix}_yes`,
      opt_in_communication: true,
    });
    const optOut = makeTestVolunteerInsert({
      name_org: `${uniquePrefix}_no`,
      opt_in_communication: false,
    });

    const { error: insertError } = await client
      .from("Volunteers")
      .insert([optIn, optOut]);

    expect(insertError).toBeNull();

    const { data: optedIn, error } = await client
      .from("Volunteers")
      .select()
      .eq("opt_in_communication", true)
      .like("name_org", `${uniquePrefix}%`);

    expect(error).toBeNull();
    expect(optedIn!.length).toBe(1);
    expect(optedIn![0]?.name_org).toBe(`${uniquePrefix}_yes`);
    expect(optedIn!.every((v) => v.opt_in_communication === true)).toBe(true);

    // Clean up this specific test's data
    await client
      .from("Volunteers")
      .delete()
      .like("name_org", `${uniquePrefix}%`);
  });
});
