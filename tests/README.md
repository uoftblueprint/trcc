# Database Testing Standard (Supabase + Vitest)

This folder contains **integration tests** that talk to a **real local Supabase** instance.

## Quick Start

```bash
# 1. Start local Supabase
npm run supabase:setup

# 2. Run all tests
npm test

# 3. Run DB tests only
npm run test:db
```

---

## Writing Tests: Team Guide

### 1. File Naming Convention

```
tests/db/<table-or-feature>.<test-type>.test.ts
```

| Pattern        | Example                     |
| -------------- | --------------------------- |
| CRUD tests     | `volunteers.crud.test.ts`   |
| Feature tests  | `volunteer-filter.test.ts`  |
| Scenario tests | `volunteers.search.test.ts` |

### 2. Test Template

Use this template for new table CRUD tests:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createServiceTestClient,
  deleteWhere,
  hasServiceRoleKey,
} from "../helpers";
import { makeTestXxxInsert } from "../factories"; // Your factory

const describeDb = hasServiceRoleKey() ? describe : describe.skip;

describeDb("db: TableName CRUD (integration)", () => {
  const client = createServiceTestClient();

  beforeEach(async () => {
    await deleteWhere(client, "TableName", "marker_column", "TEST_%");
  });

  afterEach(async () => {
    await deleteWhere(client, "TableName", "marker_column", "TEST_%");
  });

  it("creates, reads, updates, and deletes a row", async () => {
    // CREATE
    const insert = makeTestXxxInsert();
    const { data: created, error: createError } = await client
      .from("TableName")
      .insert(insert)
      .select()
      .single();

    expect(createError).toBeNull();
    expect(created).toBeTruthy();

    const id = created!.id;

    // READ
    const { data: fetched, error: readError } = await client
      .from("TableName")
      .select()
      .eq("id", id)
      .single();

    expect(readError).toBeNull();
    expect(fetched!.id).toBe(id);

    // UPDATE
    const { data: updated, error: updateError } = await client
      .from("TableName")
      .update({ some_field: "new value" })
      .eq("id", id)
      .select()
      .single();

    expect(updateError).toBeNull();

    // DELETE
    const { error: deleteError } = await client
      .from("TableName")
      .delete()
      .eq("id", id);
    expect(deleteError).toBeNull();

    // VERIFY DELETION
    const { data: afterDelete } = await client
      .from("TableName")
      .select()
      .eq("id", id);
    expect(afterDelete).toHaveLength(0);
  });
});
```

### 3. Factory Pattern

Add factories to `tests/factories.ts`:

```typescript
export function makeTestXxxInsert(
  overrides: Partial<XxxInsert> = {}
): XxxInsert {
  const token = randomToken();
  return {
    id: overrides.id ?? uniqueTestId(),
    name: overrides.name ?? `TEST_${token}`, // TEST_ prefix for cleanup
    // ... other fields
    ...overrides,
  };
}
```

**Key rules:**

- Always prefix test data with `TEST_` for easy cleanup
- Provide sensible defaults for all required fields
- Allow overrides for test-specific scenarios

### 4. Test Clients

| Client                      | Use Case                           |
| --------------------------- | ---------------------------------- |
| `createServiceTestClient()` | Setup/teardown, bypasses RLS       |
| `createAnonTestClient()`    | Testing real app behavior with RLS |

### 5. Cleanup Strategy

**DO:** Use marker-based cleanup

```typescript
beforeEach(async () => {
  await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
});
```

**DON'T:** Use TRUNCATE (breaks FK relationships)

**Order matters for FK relationships:**

```typescript
// Junction tables are cleaned by CASCADE, but clean parent tables:
await deleteWhere(client, "Volunteers", "name_org", "TEST_%");
await deleteWhere(client, "Cohorts", "term", "TEST_%");
await deleteWhere(client, "Roles", "name", "TEST_%");
```

---

## Testing Junction Tables

Junction tables require setup of parent records first:

```typescript
it("links a volunteer to a role", async () => {
  // 1. Create parent records
  const { data: volunteer } = await client
    .from("Volunteers")
    .insert(makeTestVolunteerInsert())
    .select()
    .single();

  const { data: role } = await client
    .from("Roles")
    .insert(makeTestRoleInsert())
    .select()
    .single();

  // 2. Create junction record
  const { error } = await client
    .from("VolunteerRoles")
    .insert({ volunteer_id: volunteer!.id, role_id: role!.id });

  expect(error).toBeNull();
});
```

---

## Testing Business Logic (e.g., filterMultipleColumns)

For complex functions, separate unit tests from integration tests:

```typescript
// Unit tests - no DB needed
describe("validateFilter (unit)", () => {
  it("accepts valid filter", () => {
    const result = validateFilter([...], "AND");
    expect(result.valid).toBe(true);
  });
});

// Integration tests - needs DB
describeDb("filterMultipleColumns (integration)", () => {
  // ... setup test data, then test function
});
```

---

## Common Test Scenarios

### Test unique constraints

```typescript
it("enforces unique constraint on name", async () => {
  await client.from("Roles").insert({ name: "TEST_Unique" });

  const { error } = await client.from("Roles").insert({ name: "TEST_Unique" });

  expect(error).not.toBeNull();
  expect(error!.code).toBe("23505"); // PostgreSQL unique violation
});
```

### Test nullable fields

```typescript
it("handles nullable fields", async () => {
  const { data } = await client
    .from("Volunteers")
    .insert(makeTestVolunteerInsert({ phone: null, notes: null }))
    .select()
    .single();

  expect(data!.phone).toBeNull();
  expect(data!.notes).toBeNull();
});
```

### Test cascade deletes

```typescript
it("cascades delete to junction table", async () => {
  // Create volunteer + role + link
  // ...

  // Delete parent
  await client.from("Volunteers").delete().eq("id", volunteerId);

  // Junction record should be gone
  const { data } = await client
    .from("VolunteerRoles")
    .select()
    .eq("volunteer_id", volunteerId);

  expect(data).toHaveLength(0);
});
```

### Test queries with joins

```typescript
it("queries with related data", async () => {
  const { data } = await client
    .from("VolunteerRoles")
    .select("*, Volunteers(*), Roles(*)")
    .eq("volunteer_id", id)
    .single();

  expect(data!.Roles).toBeTruthy();
  expect((data!.Roles as any).name).toBe("Expected Name");
});
```

---

## Required Environment Variables

```bash
# In .env.local or test environment
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>  # Required for CRUD tests
SUPABASE_TESTING=1
```

Get keys after starting Supabase:

```bash
npx supabase status
```

---

## Troubleshooting

| Issue                | Solution                                            |
| -------------------- | --------------------------------------------------- |
| Tests skipped        | Check `SUPABASE_SERVICE_ROLE_KEY` is set            |
| FK constraint errors | Clean up in correct order (children before parents) |
| Unique violation     | Ensure `beforeEach` cleanup runs                    |
| Connection refused   | Run `npm run supabase:setup`                        |

---

## Test Coverage Goals

Each table should have tests for:

- [ ] Basic CRUD (create, read, update, delete)
- [ ] Unique constraints
- [ ] Nullable fields
- [ ] Foreign key relationships
- [ ] Cascade behavior
- [ ] Common query patterns
