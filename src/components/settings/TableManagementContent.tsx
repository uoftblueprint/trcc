"use client";

import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  COLUMNS_CONFIG,
  tableIdForCustomColumn,
} from "@/components/volunteers/volunteerColumns";
import type { CustomColumnRow } from "@/lib/api/customColumns";
import { saveVolunteerTableGlobalSettingsAction } from "@/lib/api/actions";
import {
  NON_HIDEABLE_COLUMN_IDS,
  sanitizeHiddenColumnIds,
} from "@/lib/volunteerTable/columnVisibility";

type Row = { id: string; label: string };

const NON_HIDEABLE_SET = new Set(NON_HIDEABLE_COLUMN_IDS);

export function TableManagementContent({
  initialAdminHidden,
  customColumns,
}: {
  initialAdminHidden: string[];
  customColumns: CustomColumnRow[];
}): React.JSX.Element {
  const rows: Row[] = useMemo(() => {
    const builtIn: Row[] = COLUMNS_CONFIG.filter(
      (c) => !NON_HIDEABLE_SET.has(String(c.id))
    ).map((c) => ({
      id: String(c.id),
      label: c.label,
    }));
    const custom: Row[] = customColumns.map((c) => ({
      id: tableIdForCustomColumn(c.column_key),
      label: c.name,
    }));
    return [...builtIn, ...custom];
  }, [customColumns]);

  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(sanitizeHiddenColumnIds(initialAdminHidden))
  );
  const [saving, setSaving] = useState(false);

  const toggle = (id: string): void => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await saveVolunteerTableGlobalSettingsAction([...hidden]);
      if (!res.success) {
        toast.error(res.error ?? "Could not save");
        return;
      }
      toast.success("Table visibility saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "40rem" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#171717",
          marginBottom: "0.5rem",
        }}
      >
        Table Management
      </h1>
      <p style={{ color: "#525252", lineHeight: 1.5, marginBottom: "0.75rem" }}>
        Choose which volunteer table columns are hidden for <strong>all</strong>{" "}
        signed-in users (including other admins and staff). Personal column
        choices in Manage columns still apply on top of this list.
      </p>
      <p
        style={{
          color: "#737373",
          fontSize: "0.8125rem",
          lineHeight: 1.5,
          marginBottom: "1.25rem",
        }}
      >
        Volunteer ID and Opt-in communication always stay visible and cannot be
        hidden here.
      </p>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {rows.map((row) => (
          <li
            key={row.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem 0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              backgroundColor: "#fafafa",
            }}
          >
            <input
              id={`hide-col-${row.id}`}
              type="checkbox"
              checked={hidden.has(row.id)}
              onChange={() => toggle(row.id)}
              disabled={saving}
            />
            <label
              htmlFor={`hide-col-${row.id}`}
              style={{ cursor: saving ? "default" : "pointer", flex: 1 }}
            >
              <span style={{ fontWeight: 500, color: "#171717" }}>
                {row.label}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "#737373",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {row.id}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        style={{
          marginTop: "1.25rem",
          padding: "0.5rem 1.25rem",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#1c1917",
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Saving…" : "Save visibility"}
      </button>
    </div>
  );
}
