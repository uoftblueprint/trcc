import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { updateVolunteer } from "@/lib/api/updateVolunteer";
import { createClient } from "@/lib/client/supabase/server";
import type { Tables } from "@/lib/client/supabase/types";

vi.mock("@/lib/client/supabase/server", () => ({
  createClient: vi.fn(),
}));

const FIXED_TIME = new Date("2024-01-02T03:04:05.000Z");

const baseVolunteerRow: Tables<"Volunteers"> = {
  created_at: "2024-01-01T00:00:00.000Z",
  email: null,
  id: 1,
  name_org: "Existing",
  notes: null,
  opt_in_communication: null,
  phone: null,
  position: null,
  pronouns: null,
  pseudonym: null,
  updated_at: "2024-01-01T00:00:00.000Z",
};

type MockOptions = {
  volunteerMaybeSingleData?: Tables<"Volunteers"> | null;
  volunteerMaybeSingleError?: unknown;
  roleMaybeSingleData?: { id: number } | null;
  roleMaybeSingleError?: unknown;
  cohortMaybeSingleData?: { id: number } | null;
  cohortMaybeSingleError?: unknown;
  roleDeleteError?: unknown;
  roleInsertError?: unknown;
  cohortDeleteError?: unknown;
  cohortInsertError?: unknown;
};

type MockFn = ReturnType<typeof vi.fn>;

type ClientMocks = {
  client: { from: MockFn };
  spies: {
    volunteerUpdate: MockFn;
    volunteerEq: MockFn;
    volunteerSelect: MockFn;
    volunteerMaybeSingle: MockFn;
    roleSelect: MockFn;
    roleEqFirst: MockFn;
    roleEqSecond: MockFn;
    roleMaybeSingle: MockFn;
    roleDelete: MockFn;
    roleDeleteEq: MockFn;
    roleInsert: MockFn;
    cohortSelect: MockFn;
    cohortEqFirst: MockFn;
    cohortEqSecond: MockFn;
    cohortMaybeSingle: MockFn;
    cohortDelete: MockFn;
    cohortDeleteEq: MockFn;
    cohortInsert: MockFn;
  };
  captured: {
    volunteerUpdatePayload: unknown;
    volunteerEqArgs: unknown;
    roleInsertPayload: unknown;
    cohortInsertPayload: unknown;
  };
};

function buildMockClient(opts: MockOptions = {}): ClientMocks {
  const {
    volunteerMaybeSingleData = baseVolunteerRow,
    volunteerMaybeSingleError = null,
    roleMaybeSingleData = { id: 10 },
    roleMaybeSingleError = null,
    cohortMaybeSingleData = { id: 20 },
    cohortMaybeSingleError = null,
    roleDeleteError = null,
    roleInsertError = null,
    cohortDeleteError = null,
    cohortInsertError = null,
  } = opts;

  const volunteerMaybeSingle = vi.fn().mockResolvedValue({
    data: volunteerMaybeSingleData,
    error: volunteerMaybeSingleError,
  });
  const volunteerSelect = vi
    .fn()
    .mockReturnValue({ maybeSingle: volunteerMaybeSingle });
  const volunteerEq = vi.fn().mockReturnValue({ select: volunteerSelect });
  const volunteerUpdate = vi.fn((payload) => ({ eq: volunteerEq, payload }));

  const roleMaybeSingle = vi.fn().mockResolvedValue({
    data: roleMaybeSingleData,
    error: roleMaybeSingleError,
  });
  const roleEqSecond = vi
    .fn()
    .mockReturnValue({ maybeSingle: roleMaybeSingle });
  const roleEqFirst = vi.fn().mockReturnValue({ eq: roleEqSecond });
  const roleSelect = vi.fn().mockReturnValue({ eq: roleEqFirst });

  const roleDeleteEq = vi.fn().mockResolvedValue({ error: roleDeleteError });
  const roleDelete = vi.fn().mockReturnValue({ eq: roleDeleteEq });
  const roleInsert = vi.fn().mockResolvedValue({ error: roleInsertError });

  const cohortMaybeSingle = vi.fn().mockResolvedValue({
    data: cohortMaybeSingleData,
    error: cohortMaybeSingleError,
  });
  const cohortEqSecond = vi
    .fn()
    .mockReturnValue({ maybeSingle: cohortMaybeSingle });
  const cohortEqFirst = vi.fn().mockReturnValue({ eq: cohortEqSecond });
  const cohortSelect = vi.fn().mockReturnValue({ eq: cohortEqFirst });

  const cohortDeleteEq = vi
    .fn()
    .mockResolvedValue({ error: cohortDeleteError });
  const cohortDelete = vi.fn().mockReturnValue({ eq: cohortDeleteEq });
  const cohortInsert = vi.fn().mockResolvedValue({ error: cohortInsertError });

  const client = {
    from: vi.fn((table: string) => {
      switch (table) {
        case "Volunteers":
          return { update: volunteerUpdate };
        case "Roles":
          return { select: roleSelect };
        case "VolunteerRoles":
          return { delete: roleDelete, insert: roleInsert };
        case "Cohorts":
          return { select: cohortSelect };
        case "VolunteerCohorts":
          return { delete: cohortDelete, insert: cohortInsert };
        default:
          throw new Error(`Unexpected table ${table}`);
      }
    }),
  };

  return {
    client,
    spies: {
      volunteerUpdate,
      volunteerEq,
      volunteerSelect,
      volunteerMaybeSingle,
      roleSelect,
      roleEqFirst,
      roleEqSecond,
      roleMaybeSingle,
      roleDelete,
      roleDeleteEq,
      roleInsert,
      cohortSelect,
      cohortEqFirst,
      cohortEqSecond,
      cohortMaybeSingle,
      cohortDelete,
      cohortDeleteEq,
      cohortInsert,
    },
    captured: {
      get volunteerUpdatePayload(): unknown {
        return volunteerUpdate.mock.calls.at(-1)?.[0];
      },
      get volunteerEqArgs(): unknown {
        return volunteerEq.mock.calls.at(-1);
      },
      get roleInsertPayload(): unknown {
        return roleInsert.mock.calls.at(-1)?.[0];
      },
      get cohortInsertPayload(): unknown {
        return cohortInsert.mock.calls.at(-1)?.[0];
      },
    },
  };
}

describe("updateVolunteer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function resolveClient(mock: ClientMocks): void {
    vi.mocked(createClient).mockResolvedValue(
      mock.client as unknown as Awaited<ReturnType<typeof createClient>>
    );
  }

  type UpdateResult = Awaited<ReturnType<typeof updateVolunteer>>;

  function getError(result: UpdateResult): string {
    if ("error" in result.body) {
      return result.body.error;
    }
    throw new Error("Expected error result but received success");
  }

  function getVolunteer(result: UpdateResult): Tables<"Volunteers"> {
    if ("volunteer" in result.body) {
      return result.body.volunteer;
    }
    throw new Error("Expected success result but received error");
  }

  it("returns 400 for invalid volunteer id without touching Supabase", async () => {
    const result = await updateVolunteer("bad-id", {});

    expect(result.status).toBe(400);
    expect(getError(result)).toContain("Invalid volunteer id");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns 400 for unknown body fields before creating client", async () => {
    const result = await updateVolunteer(1, { foo: "bar" });

    expect(result.status).toBe(400);
    expect(getError(result)).toContain("Unknown field");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("updates volunteer fields and stamps updated_at", async () => {
    const updatedVolunteer = {
      ...baseVolunteerRow,
      name_org: "Updated Name",
      phone: "123",
      updated_at: FIXED_TIME.toISOString(),
    };
    const mock = buildMockClient({
      volunteerMaybeSingleData: updatedVolunteer,
    });
    resolveClient(mock);

    const result = await updateVolunteer(1, {
      name_org: "Updated Name",
      phone: "123",
    });

    expect(createClient).toHaveBeenCalled();
    expect(result).toEqual({
      status: 200,
      body: { volunteer: updatedVolunteer },
    });
    expect(mock.spies.volunteerUpdate).toHaveBeenCalledTimes(1);
    expect(mock.captured.volunteerUpdatePayload).toMatchObject({
      name_org: "Updated Name",
      phone: "123",
      updated_at: FIXED_TIME.toISOString(),
    });
  });

  it("returns 400 when role does not exist", async () => {
    const mock = buildMockClient({ roleMaybeSingleData: null });
    resolveClient(mock);

    const result = await updateVolunteer(1, {
      role: { name: "Advocate", type: "prior" },
      name_org: "Name",
    });

    expect(result.status).toBe(400);
    expect(getError(result)).toBe("Role not found");
    expect(mock.spies.roleDelete).not.toHaveBeenCalled();
    expect(mock.spies.roleInsert).not.toHaveBeenCalled();
  });

  it("updates role and cohort when both provided", async () => {
    const updatedVolunteer = {
      ...baseVolunteerRow,
      updated_at: FIXED_TIME.toISOString(),
    };
    const mock = buildMockClient({
      volunteerMaybeSingleData: updatedVolunteer,
      roleMaybeSingleData: { id: 5 },
      cohortMaybeSingleData: { id: 7 },
    });
    resolveClient(mock);

    const result = await updateVolunteer(1, {
      name_org: "Keep Name",
      role: { name: "Advocate", type: "current" },
      cohort: { year: 2024, term: "fall" },
    });

    expect(result.status).toBe(200);
    expect(mock.spies.roleDelete).toHaveBeenCalledTimes(1);
    expect(mock.spies.roleInsert).toHaveBeenCalledTimes(1);
    expect(mock.captured.roleInsertPayload).toEqual({
      volunteer_id: 1,
      role_id: 5,
      created_at: FIXED_TIME.toISOString(),
    });

    expect(mock.spies.cohortDelete).toHaveBeenCalledTimes(1);
    expect(mock.spies.cohortInsert).toHaveBeenCalledTimes(1);
    expect(mock.captured.cohortInsertPayload).toEqual({
      volunteer_id: 1,
      cohort_id: 7,
      assigned_at: FIXED_TIME.toISOString(),
    });
    expect(getVolunteer(result)).toEqual(updatedVolunteer);
  });

  it("returns 400 when no updatable fields, role, or cohort provided", async () => {
    const result = await updateVolunteer(1, {});

    expect(result.status).toBe(400);
    expect(getError(result)).toContain("At least one updatable field");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid role type", async () => {
    const result = await updateVolunteer(1, {
      name_org: "Name",
      role: { name: "Advocate", type: "past" },
    });

    expect(result.status).toBe(400);
    expect(getError(result)).toContain("role.type");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid cohort term", async () => {
    const result = await updateVolunteer(1, {
      cohort: { year: 2024, term: "autumn" },
    });

    expect(result.status).toBe(400);
    expect(getError(result)).toContain("cohort.term");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns 404 when volunteer is not found", async () => {
    const mock = buildMockClient({ volunteerMaybeSingleData: null });
    resolveClient(mock);

    const result = await updateVolunteer(1, { name_org: "Name" });

    expect(result.status).toBe(404);
    expect(getError(result)).toBe("Volunteer not found");
  });

  it("returns 500 when volunteer update fails", async () => {
    const mock = buildMockClient({
      volunteerMaybeSingleError: { message: "db error" },
    });
    resolveClient(mock);

    const result = await updateVolunteer(1, { name_org: "Name" });

    expect(result.status).toBe(500);
    expect(getError(result)).toBe("db error");
  });

  it("returns 500 when role delete fails", async () => {
    const mock = buildMockClient({
      roleDeleteError: { message: "cannot delete role link" },
    });
    resolveClient(mock);

    const result = await updateVolunteer(1, {
      name_org: "Name",
      role: { name: "Advocate", type: "current" },
    });

    expect(result.status).toBe(500);
    expect(getError(result)).toBe("cannot delete role link");
  });

  it("returns 500 when role insert fails", async () => {
    const mock = buildMockClient({
      roleInsertError: { message: "cannot insert role link" },
    });
    resolveClient(mock);

    const result = await updateVolunteer(1, {
      name_org: "Name",
      role: { name: "Advocate", type: "current" },
    });

    expect(result.status).toBe(500);
    expect(getError(result)).toBe("cannot insert role link");
  });

  it("returns 500 when cohort delete fails", async () => {
    const mock = buildMockClient({
      cohortDeleteError: { message: "cannot delete cohort link" },
    });
    resolveClient(mock);

    const result = await updateVolunteer(1, {
      name_org: "Name",
      cohort: { year: 2024, term: "fall" },
    });

    expect(result.status).toBe(500);
    expect(getError(result)).toBe("cannot delete cohort link");
  });

  it("returns 500 when cohort insert fails", async () => {
    const mock = buildMockClient({
      cohortInsertError: { message: "cannot insert cohort link" },
    });
    resolveClient(mock);

    const result = await updateVolunteer(1, {
      name_org: "Name",
      cohort: { year: 2024, term: "fall" },
    });

    expect(result.status).toBe(500);
    expect(getError(result)).toBe("cannot insert cohort link");
  });
});
