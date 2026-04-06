"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Columns3, Info, LayoutList, Loader2, Sparkles } from "lucide-react";
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

function serializeHidden(s: Set<string>): string {
  return JSON.stringify([...s].sort());
}

const rowBaseStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "0.75rem 1rem",
  marginBottom: "0.5rem",
  borderRadius: "6px",
  border: "1px solid #e5e5e5",
  backgroundColor: "#fff",
};

function ColumnToggleRow({
  row,
  isHidden,
  disabled,
  onToggle,
}: {
  row: Row;
  isHidden: boolean;
  disabled: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <div
      style={{
        ...rowBaseStyle,
        ...(isHidden
          ? {
              borderColor: "#e9d5ff",
              backgroundColor: "#faf5ff",
            }
          : {}),
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#171717",
            margin: 0,
          }}
        >
          {row.label}
        </p>
        <p
          style={{
            margin: "0.25rem 0 0",
            fontFamily: "ui-monospace, monospace",
            fontSize: "0.6875rem",
            color: "#737373",
            wordBreak: "break-all",
          }}
        >
          {row.id}
        </p>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            color: isHidden ? "#6b21a8" : "#15803d",
            whiteSpace: "nowrap",
          }}
        >
          {isHidden ? "Hidden for everyone" : "Visible to everyone"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isHidden}
          aria-label={`${isHidden ? "Show" : "Hide"} ${row.label} for all users`}
          disabled={disabled}
          onClick={onToggle}
          style={{
            position: "relative",
            display: "inline-flex",
            height: "28px",
            width: "44px",
            flexShrink: 0,
            cursor: disabled ? "not-allowed" : "pointer",
            borderRadius: "9999px",
            border: "2px solid transparent",
            backgroundColor: isHidden
              ? "var(--trcc-purple, #7c3aed)"
              : "#e5e5e5",
            opacity: disabled ? 0.5 : 1,
            transition: "background-color 0.2s ease",
          }}
        >
          <span
            style={{
              pointerEvents: "none",
              display: "inline-block",
              height: "24px",
              width: "24px",
              borderRadius: "9999px",
              backgroundColor: "#fff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              transform: isHidden ? "translateX(16px)" : "translateX(2px)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
      </div>
    </div>
  );
}

export function TableManagementContent({
  initialAdminHidden,
  customColumns,
}: {
  initialAdminHidden: string[];
  customColumns: CustomColumnRow[];
}): React.JSX.Element {
  const builtInRows: Row[] = useMemo(
    () =>
      COLUMNS_CONFIG.filter((c) => !NON_HIDEABLE_SET.has(String(c.id))).map(
        (c) => ({
          id: String(c.id),
          label: c.label,
        })
      ),
    []
  );

  const customRows: Row[] = useMemo(
    () =>
      customColumns.map((c) => ({
        id: tableIdForCustomColumn(c.column_key),
        label: c.name,
      })),
    [customColumns]
  );

  const [hidden, setHidden] = useState<Set<string>>(() => {
    return new Set(sanitizeHiddenColumnIds(initialAdminHidden));
  });
  const [savedSignature, setSavedSignature] = useState(() =>
    serializeHidden(new Set(sanitizeHiddenColumnIds(initialAdminHidden)))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = new Set(sanitizeHiddenColumnIds(initialAdminHidden));
    setHidden(next);
    setSavedSignature(serializeHidden(next));
  }, [initialAdminHidden]);

  const isDirty = serializeHidden(hidden) !== savedSignature;

  const toggle = (id: string): void => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hiddenCount = hidden.size;

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      const res = await saveVolunteerTableGlobalSettingsAction([...hidden]);
      if (!res.success) {
        toast.error(res.error ?? "Could not save");
        return;
      }
      setSavedSignature(serializeHidden(hidden));
      toast.success("Volunteers table visibility updated");
    } finally {
      setSaving(false);
    }
  };

  const sectionHeadingStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.5rem",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#404040",
    margin: 0,
  };

  const sectionHintStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    color: "#737373",
    margin: "0 0 0.75rem",
    lineHeight: 1.5,
    maxWidth: "40rem",
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              backgroundColor: "var(--trcc-light-purple, #ede9fe)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Columns3
              style={{
                width: 20,
                height: 20,
                color: "var(--trcc-purple, #7c3aed)",
              }}
              aria-hidden
            />
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#171717",
                margin: 0,
              }}
            >
              Table Management
            </h1>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#737373",
                margin: "0.25rem 0 0",
                lineHeight: 1.5,
                maxWidth: "36rem",
              }}
            >
              <span style={{ color: "#404040", fontWeight: 600 }}>
                {builtInRows.length + customRows.length} column
                {builtInRows.length + customRows.length === 1 ? "" : "s"}
              </span>
              <span style={{ color: "#a3a3a3" }}> · </span>
              Choose which columns are hidden for every signed-in user on the
              volunteers dashboard. Personal “Manage columns” settings can hide
              additional columns on top of this list.
            </p>
          </div>
        </div>
      </div>

      <div
        role="note"
        style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          marginBottom: "1.5rem",
          backgroundColor: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "6px",
          fontSize: "0.875rem",
          color: "#92400e",
          lineHeight: 1.5,
        }}
      >
        <Info
          style={{
            width: 18,
            height: 18,
            flexShrink: 0,
            marginTop: 2,
            color: "#b45309",
          }}
          aria-hidden
        />
        <p style={{ margin: 0 }}>
          <span style={{ fontWeight: 600 }}>Always visible:</span> Volunteer ID
          and Opt-in communication cannot be hidden here or in personal column
          settings.
        </p>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div style={sectionHeadingStyle}>
          <LayoutList
            style={{ width: 16, height: 16, color: "#737373" }}
            aria-hidden
          />
          <h2 id="builtin-heading" style={sectionTitleStyle}>
            Built-in columns
          </h2>
        </div>
        <p style={sectionHintStyle}>
          Standard volunteer fields. Turn the switch on to hide a column for the
          whole team.
        </p>
        <div>
          {builtInRows.map((row) => (
            <ColumnToggleRow
              key={row.id}
              row={row}
              isHidden={hidden.has(row.id)}
              disabled={saving}
              onToggle={() => toggle(row.id)}
            />
          ))}
        </div>
      </div>

      {customRows.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <div style={sectionHeadingStyle}>
            <Sparkles
              style={{
                width: 16,
                height: 16,
                color: "var(--trcc-purple, #7c3aed)",
              }}
              aria-hidden
            />
            <h2 id="custom-heading" style={sectionTitleStyle}>
              Custom columns
            </h2>
          </div>
          <p style={sectionHintStyle}>
            Fields your organization added in Manage columns. You can hide them
            here without deleting stored data.
          </p>
          <div>
            {customRows.map((row) => (
              <ColumnToggleRow
                key={row.id}
                row={row}
                isHidden={hidden.has(row.id)}
                disabled={saving}
                onToggle={() => toggle(row.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "0.75rem",
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          backgroundColor: isDirty ? "#fffbeb" : "#f9fafb",
          border: isDirty ? "1px solid #fde68a" : "1px solid #e5e5e5",
          borderRadius: "8px",
        }}
      >
        <span
          style={{
            marginRight: "auto",
            fontSize: "0.875rem",
            color: isDirty ? "#92400e" : "#525252",
            fontWeight: isDirty ? 500 : 400,
          }}
        >
          {hiddenCount === 0 ? (
            <span style={{ color: "#15803d" }}>
              All listed columns visible.
            </span>
          ) : (
            <>
              <span style={{ fontWeight: 600, color: "#171717" }}>
                {hiddenCount}
              </span>{" "}
              column{hiddenCount === 1 ? "" : "s"} hidden for everyone
            </>
          )}
          {isDirty && (
            <span style={{ marginLeft: "0.5rem", color: "#b45309" }}>
              · Unsaved changes
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !isDirty}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            backgroundColor:
              saving || !isDirty ? "#d4d4d4" : "var(--trcc-purple, #7c3aed)",
            color: "#fff",
            border: "none",
            fontWeight: 500,
            cursor: saving || !isDirty ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
          }}
        >
          {saving ? (
            <>
              <Loader2
                style={{ width: 16, height: 16 }}
                className="animate-spin"
                aria-hidden
              />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </div>
  );
}
