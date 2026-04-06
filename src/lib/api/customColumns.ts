"use server";

import { createAdminClient } from "@/lib/client/supabase/server";
import type { Tables, TablesInsert } from "@/lib/client/supabase/types";

export type CustomColumnRow = Tables<"CustomColumns">;

const RESERVED_COLUMN_KEYS = new Set([
  "id",
  "volunteer_id",
  "name_org",
  "email",
  "phone",
  "pseudonym",
  "pronouns",
  "cohorts",
  "prior_roles",
  "current_roles",
  "future_interests",
  "opt_in_communication",
  "notes",
  "custom_data",
  "position",
  "created_at",
  "updated_at",
]);

export function slugifyColumnKey(name: string): string {
  const raw = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  const base = raw.length > 0 ? raw : "column";
  return /^[a-z]/.test(base) ? base : `c_${base}`;
}

export async function listCustomColumns(): Promise<CustomColumnRow[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("CustomColumns")
    .select("*")
    .order("default_position", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type NewCustomColumnInput = {
  name: string;
  data_type: "text" | "number" | "boolean" | "tag";
  tag_options?: string[];
  is_multi?: boolean;
};

export type ColumnMutationResult = {
  success: boolean;
  label: string;
  error?: string;
  id?: number;
};

async function nextDefaultPosition(
  client: ReturnType<typeof createAdminClient>
): Promise<number> {
  const { data, error } = await client
    .from("CustomColumns")
    .select("default_position")
    .order("default_position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const max = data?.default_position ?? -1;
  return max + 1;
}

export async function createCustomColumnsBatch(
  columns: NewCustomColumnInput[],
  createdBy: string | null
): Promise<ColumnMutationResult[]> {
  const client = createAdminClient();
  const results: ColumnMutationResult[] = [];
  let position = await nextDefaultPosition(client);

  const existingKeys = new Set(
    (await listCustomColumns()).map((r) => r.column_key)
  );

  for (const col of columns) {
    const label = col.name.trim() || "(unnamed)";
    let column_key = slugifyColumnKey(col.name);
    if (RESERVED_COLUMN_KEYS.has(column_key) || existingKeys.has(column_key)) {
      let n = 2;
      let candidate = `${column_key}_${n}`;
      while (
        RESERVED_COLUMN_KEYS.has(candidate) ||
        existingKeys.has(candidate)
      ) {
        n++;
        candidate = `${column_key}_${n}`;
      }
      column_key = candidate;
    }

    if (!["text", "number", "boolean", "tag"].includes(col.data_type)) {
      results.push({
        success: false,
        label,
        error: "Invalid data type",
      });
      continue;
    }

    const row: TablesInsert<"CustomColumns"> = {
      name: col.name.trim(),
      column_key,
      data_type: col.data_type,
      tag_options:
        col.data_type === "tag"
          ? [
              ...new Set(
                (col.tag_options ?? []).map((t) => t.trim()).filter(Boolean)
              ),
            ]
          : [],
      is_multi: col.data_type === "tag" ? Boolean(col.is_multi) : false,
      default_position: position,
      created_by: createdBy,
    };

    const { data, error } = await client
      .from("CustomColumns")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      results.push({
        success: false,
        label,
        error: error.message,
      });
    } else {
      existingKeys.add(column_key);
      position += 1;
      results.push({
        success: true,
        label: `${label} (${col.data_type})`,
        id: data.id,
      });
    }
  }

  return results;
}

export async function deleteCustomColumnsBatch(
  columnIds: number[]
): Promise<ColumnMutationResult[]> {
  const client = createAdminClient();
  const results: ColumnMutationResult[] = [];

  for (const id of columnIds) {
    const { data: row, error: fetchErr } = await client
      .from("CustomColumns")
      .select("id, name, column_key")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      results.push({
        success: false,
        label: `ID ${id}`,
        error: fetchErr.message,
      });
      continue;
    }
    if (!row) {
      results.push({
        success: false,
        label: `ID ${id}`,
        error: "Column not found",
      });
      continue;
    }

    const { error: rpcErr } = await client.rpc("remove_custom_column_data", {
      p_column_key: row.column_key,
    });
    if (rpcErr) {
      results.push({
        success: false,
        label: row.name,
        error: rpcErr.message,
      });
      continue;
    }

    const { error: delErr } = await client
      .from("CustomColumns")
      .delete()
      .eq("id", id);
    if (delErr) {
      results.push({
        success: false,
        label: row.name,
        error: delErr.message,
      });
    } else {
      results.push({
        success: true,
        label: `Delete “${row.name}”`,
        id: row.id,
      });
    }
  }

  return results;
}

export type CustomColumnUpdate = {
  name?: string;
  tag_options?: string[];
};

export async function updateCustomColumn(
  columnId: number,
  patch: CustomColumnUpdate
): Promise<{ success: boolean; error?: string }> {
  const client = createAdminClient();

  const { data: existing, error: fetchErr } = await client
    .from("CustomColumns")
    .select("id, data_type")
    .eq("id", columnId)
    .maybeSingle();

  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!existing) return { success: false, error: "Column not found" };

  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return { success: false, error: "Name cannot be empty" };
    updates["name"] = n;
  }
  if (patch.tag_options !== undefined) {
    if (existing.data_type !== "tag") {
      return {
        success: false,
        error: "tag_options only applies to tag columns",
      };
    }
    updates["tag_options"] = [
      ...new Set(patch.tag_options.map((t) => t.trim()).filter(Boolean)),
    ];
  }

  if (Object.keys(updates).length === 0) {
    return { success: true };
  }

  const { error } = await client
    .from("CustomColumns")
    .update(updates)
    .eq("id", columnId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
