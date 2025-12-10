import type { Database } from "@/lib/client/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export async function createTestUser(
  client: SupabaseClient<Database>,
  overrides?: Partial<TablesInsert<"Users">>
): Promise<TablesInsert<"Users"> & { id: string }> {
  const user: TablesInsert<"Users"> = {
    id: overrides?.id || `test-user-${Date.now()}`,
    email: overrides?.email || `test-${Date.now()}@example.com`,
    role: overrides?.role || null,
    ...overrides,
  };

  const { data, error } = await client
    .from("Users")
    .insert(user)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data;
}

export async function createTestVolunteer(
  client: SupabaseClient<Database>,
  overrides?: Partial<TablesInsert<"Volunteers">>
): Promise<TablesInsert<"Volunteers"> & { id: number }> {
  const volunteer: TablesInsert<"Volunteers"> = {
    name_org: overrides?.name_org || `Test Volunteer ${Date.now()}`,
    email: overrides?.email || `volunteer-${Date.now()}@example.com`,
    phone: overrides?.phone || null,
    position: overrides?.position || null,
    pronouns: overrides?.pronouns || null,
    pseudonym: overrides?.pseudonym || null,
    notes: overrides?.notes || null,
    opt_in_communication: overrides?.opt_in_communication || null,
    ...overrides,
  };

  const { data, error } = await client
    .from("Volunteers")
    .insert(volunteer)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test volunteer: ${error.message}`);
  }

  return data;
}
