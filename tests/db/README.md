# Database testing standard (Supabase + Vitest)

This folder contains **integration tests** that talk to a **real local Supabase** instance.

## One-time setup

1. Ensure you have a working `trcc/.env.local` (provided by the team).
2. Start/reset local Supabase (runs Docker containers, pulls schema, applies migrations):

```bash
npm run supabase:setup
```

## Required env vars for DB tests

Vitest loads `tests/setup.ts` before tests run. That file sets:

- `NEXT_PUBLIC_SUPABASE_URL` (defaults to `http://127.0.0.1:54321`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (mapped from `NEXT_PUBLIC_SUPABASE_LOCAL_PUBLISHABLE_KEY`)
- `SUPABASE_TESTING=1`

For **CRUD tests that insert/update/delete**, we strongly recommend providing a service role key:

- `SUPABASE_SERVICE_ROLE_KEY`

Why: the **service role key bypasses RLS**, so tests can set up fixtures and clean up reliably.

Tip: once Supabase is running locally, you can usually see keys via:

```bash
npx supabase status
```

## Running tests

- All tests:

```bash
npm run test
```

- DB tests only:

```bash
npm run test:db
```

## Team conventions (copy/paste standard)

### File naming

- `tests/db/<table-or-feature>.<crud-or-scenario>.test.ts`
- Examples:
  - `tests/db/cohorts.crud.test.ts`
  - `tests/db/volunteers.search.test.ts`

### Keys + clients

- Use `createAnonTestClient()` when you want the same permissions as the app (subject to RLS).
- Use `createServiceTestClient()` for setup/teardown (fixtures + cleanup).

### Cleanup strategy

Avoid `TRUNCATE` unless you really need it (FK relationships make it brittle).

Preferred approach:

- Insert rows with a deterministic marker (e.g. `term: "TEST_<token>"`)
- Cleanup with `deleteWhere(..., "term", "TEST_%")` in `beforeEach` / `afterEach`.
