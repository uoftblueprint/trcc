import { createClient } from "@/lib/client/supabase";
import type { Tables, TablesUpdate } from "@/lib/client/supabase/types";

const ROLE_TYPES = ["prior", "current", "future_interest"] as const;

type RolePatch = Pick<TablesUpdate<"Roles">, "name" | "type" | "is_active">;

type UpdateRoleResult =
  | { status: 200; body: { role: Tables<"Roles"> } }
  | { status: 400 | 404 | 409 | 500; body: { error: string } };

const ALLOWED_FIELDS = new Set<keyof RolePatch>(["name", "type", "is_active"]);

function validateRoleUpdateBody(body: unknown): {
  updates?: RolePatch;
  error?: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const payload = body as Record<string, unknown>;
  const unknownKeys = Object.keys(payload).filter(
    (key) => !ALLOWED_FIELDS.has(key as keyof RolePatch)
  );

  if (unknownKeys.length > 0) {
    return { error: `Unknown field(s): ${unknownKeys.join(", ")}` };
  }

  const updates: RolePatch = {};

  if ("name" in payload) {
    const name = payload["name"];
    if (typeof name !== "string") {
      return { error: "Field name must be a string" };
    }
    if (name.trim().length === 0) {
      return { error: "Field name cannot be empty" };
    }
    updates.name = name.trim();
  }

  if ("type" in payload) {
    const type = payload["type"];
    if (typeof type !== "string") {
      return { error: "Field type must be a string" };
    }

    const normalizedType = type.trim();
    if (!ROLE_TYPES.includes(normalizedType as (typeof ROLE_TYPES)[number])) {
      return {
        error: `Field type must be one of ${ROLE_TYPES.join(", ")}`,
      };
    }

    updates.type = normalizedType;
  }

  if ("is_active" in payload) {
    const isActive = payload["is_active"];
    if (typeof isActive !== "boolean") {
      return { error: "Field is_active must be a boolean" };
    }
    updates.is_active = isActive;
  }

  if (Object.keys(updates).length === 0) {
    return { error: "At least one updatable field is required" };
  }

  return { updates };
}

export async function updateRole(
  roleId: unknown,
  body: unknown
): Promise<UpdateRoleResult> {
  if (!Number.isInteger(roleId) || (roleId as number) <= 0) {
    return { status: 400, body: { error: "Invalid role id" } };
  }

  const validation = validateRoleUpdateBody(body);
  if (!validation.updates) {
    return {
      status: 400,
      body: { error: validation.error ?? "Invalid role update payload" },
    };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("Roles")
    .update(validation.updates)
    .eq("id", roleId as number)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { status: 409, body: { error: error.message } };
    }
    return { status: 500, body: { error: error.message } };
  }

  if (!data) {
    return { status: 404, body: { error: "Role not found" } };
  }

  return { status: 200, body: { role: data } };
}
