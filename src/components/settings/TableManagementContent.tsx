"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Columns3, EyeOff, Info, Loader2, Plus, Trash2 } from "lucide-react";
import {
  COLUMNS_CONFIG,
  tableIdForCustomColumn,
} from "@/components/volunteers/volunteerColumns";
import type {
  CustomColumnRow,
  NewCustomColumnInput,
} from "@/lib/api/customColumns";
import {
  createCustomColumnsAction,
  deleteCustomColumnsAction,
  saveVolunteerTableGlobalSettingsAction,
} from "@/lib/api/actions";
import {
  NON_HIDEABLE_COLUMN_IDS,
  sanitizeHiddenColumnIds,
} from "@/lib/volunteerTable/columnVisibility";

type Row = { id: string; label: string };

const NON_HIDEABLE_SET = new Set(NON_HIDEABLE_COLUMN_IDS);

/** Drop org-hidden ids that no longer match a built-in or current custom column (e.g. after a column was deleted). */
function filterAdminHiddenToExistingColumns(
  adminHidden: string[],
  customColumns: CustomColumnRow[]
): Set<string> {
  const listed = new Set<string>();
  for (const c of COLUMNS_CONFIG) {
    if (!NON_HIDEABLE_SET.has(String(c.id))) {
      listed.add(String(c.id));
    }
  }
  for (const col of customColumns) {
    listed.add(tableIdForCustomColumn(col.column_key));
  }
  return new Set(
    sanitizeHiddenColumnIds(adminHidden).filter((id) => listed.has(id))
  );
}

function serializeHidden(s: Set<string>): string {
  return JSON.stringify([...s].sort());
}

const settingsPanelStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
  padding: "1.25rem",
  borderRadius: "10px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#e5e5e5",
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
};

const panelIconWrapStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "8px",
  backgroundColor: "var(--trcc-light-purple, #ede9fe)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "#171717",
  margin: 0,
  lineHeight: 1.3,
};

const panelDescriptionStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "#737373",
  margin: "0.35rem 0 0",
  lineHeight: 1.5,
  maxWidth: "52rem",
};

const subsectionHeadingRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "0.5rem",
};

const subsectionTitleStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#525252",
  margin: 0,
};

const subsectionHintStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#737373",
  margin: "0 0 0.75rem",
  lineHeight: 1.5,
  maxWidth: "40rem",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 500,
  color: "#404040",
  marginBottom: "0.25rem",
};

const fieldControlStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "0.5rem 0.625rem",
  fontSize: "0.875rem",
  borderRadius: "6px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#e5e5e5",
  backgroundColor: "#fff",
};

const panelFooterRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "0.75rem",
  marginTop: "1.25rem",
  paddingTop: "1rem",
  borderTop: "1px solid #e5e5e5",
};

function SettingsSection({
  sectionId,
  title,
  description,
  icon,
  iconFrameStyle,
  children,
  footer,
}: {
  sectionId: string;
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  /** Merged onto the default icon tile (e.g. danger tint for remove section). */
  iconFrameStyle?: React.CSSProperties;
  children: React.ReactNode;
  footer?: React.ReactNode;
}): React.JSX.Element {
  return (
    <section style={settingsPanelStyle} aria-labelledby={sectionId}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ ...panelIconWrapStyle, ...iconFrameStyle }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id={sectionId} style={panelTitleStyle}>
            {title}
          </h2>
          <div style={panelDescriptionStyle}>{description}</div>
        </div>
      </div>
      {children}
      {footer}
    </section>
  );
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
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#e5e5e5",
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

function customColumnTypeLabel(c: CustomColumnRow): string {
  if (c.data_type === "tag") {
    return c.is_multi ? "Tags (multiple)" : "Tag";
  }
  if (c.data_type === "boolean") return "Yes / No";
  if (c.data_type === "number") return "Number";
  return "Text";
}

function CustomColumnDeleteRow({
  column,
  disabled,
  onRequestRemove,
}: {
  column: CustomColumnRow;
  disabled: boolean;
  onRequestRemove: () => void;
}): React.JSX.Element {
  const tid = tableIdForCustomColumn(column.column_key);
  return (
    <div style={rowBaseStyle}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#171717",
            margin: 0,
          }}
        >
          {column.name}
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
          {tid}
        </p>
        <p
          style={{
            margin: "0.35rem 0 0",
            fontSize: "0.6875rem",
            color: "#a3a3a3",
          }}
        >
          {customColumnTypeLabel(column)}
        </p>
      </div>
      <button
        type="button"
        onClick={onRequestRemove}
        disabled={disabled}
        aria-label={`Remove column ${column.name}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          flexShrink: 0,
          padding: "0.4rem 0.75rem",
          borderRadius: "6px",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "#fecaca",
          backgroundColor: "#fff",
          color: "#b91c1c",
          fontSize: "0.8125rem",
          fontWeight: 500,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Trash2 style={{ width: 14, height: 14 }} aria-hidden />
        Remove
      </button>
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
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] =
    useState<NewCustomColumnInput["data_type"]>("text");
  const [tagOptionsRaw, setTagOptionsRaw] = useState("");
  const [tagMulti, setTagMulti] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteColumn, setConfirmDeleteColumn] =
    useState<CustomColumnRow | null>(null);

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

  const [hidden, setHidden] = useState<Set<string>>(() =>
    filterAdminHiddenToExistingColumns(initialAdminHidden, customColumns)
  );
  const [savedSignature, setSavedSignature] = useState(() =>
    serializeHidden(
      filterAdminHiddenToExistingColumns(initialAdminHidden, customColumns)
    )
  );
  const [saving, setSaving] = useState(false);

  const customColumnIdsKey = useMemo(
    () => customColumns.map((c) => c.id).join(","),
    [customColumns]
  );

  useEffect(() => {
    const next = filterAdminHiddenToExistingColumns(
      initialAdminHidden,
      customColumns
    );
    setHidden(next);
    setSavedSignature(serializeHidden(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- customColumnIdsKey tracks custom column set; omitting `customColumns` avoids resets when the parent passes a new array reference with the same columns
  }, [initialAdminHidden, customColumnIdsKey]);

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

  const handleCreateCustomColumn = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) {
      toast.error("Enter a column name");
      return;
    }
    let payload: NewCustomColumnInput;
    if (newType === "tag") {
      const tag_options = tagOptionsRaw
        .split(/[,|\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      payload = {
        name,
        data_type: "tag",
        tag_options,
        is_multi: tagMulti,
      };
    } else {
      payload = { name, data_type: newType };
    }
    setCreating(true);
    try {
      const results = await createCustomColumnsAction([payload]);
      const r = results[0];
      if (!r) {
        toast.error("No response from server");
        return;
      }
      if (r.success) {
        toast.success(`Column “${r.label}” created`);
        setNewName("");
        setNewType("text");
        setTagOptionsRaw("");
        setTagMulti(false);
        router.refresh();
      } else {
        toast.error(r.error ?? `Could not create “${r.label}”`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDeleteColumn = async (): Promise<void> => {
    if (!confirmDeleteColumn) return;
    setDeleting(true);
    try {
      const results = await deleteCustomColumnsAction([confirmDeleteColumn.id]);
      const r = results[0];
      if (!r) {
        toast.error("No response from server");
        return;
      }
      if (r.success) {
        toast.success(`Removed column “${confirmDeleteColumn.name}”`);
        setConfirmDeleteColumn(null);
        router.refresh();
      } else {
        toast.error(r.error ?? `Could not remove “${r.label}”`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || creating || deleting;

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
                margin: "0.2rem 0 0",
              }}
            >
              Volunteers Table Settings
            </h1>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#737373",
                margin: "0.35rem 0 0",
                lineHeight: 1.5,
                maxWidth: "64rem",
              }}
            >
              <span style={{ color: "#404040", fontWeight: 600 }}>
                {builtInRows.length + customRows.length} column
                {builtInRows.length + customRows.length === 1 ? "" : "s"}
              </span>
              <span style={{ color: "#a3a3a3" }}> · </span>
              Configure organization-wide settings for the volunteers table:
              hide columns for everyone, add custom columns, or delete custom
              columns and their data. Any user can still personalize visibility
              and reorder columns in the{" "}
              <span style={{ fontStyle: "italic" }}>Manage columns</span> pop-up
              in the table.
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

      <SettingsSection
        sectionId="hide-columns-heading"
        title="Hide columns for everyone"
        description={
          <>
            Turn a switch on to hide that column for every signed-in user. Use{" "}
            <strong>Save changes</strong> in the footer of this panel to apply
            visibility updates.
          </>
        }
        icon={
          <EyeOff
            style={{
              width: 18,
              height: 18,
              color: "var(--trcc-purple, #7c3aed)",
            }}
            aria-hidden
          />
        }
        footer={
          <div style={panelFooterRowStyle}>
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
              disabled={busy || !isDirty}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                backgroundColor:
                  busy || !isDirty ? "#d4d4d4" : "var(--trcc-purple, #7c3aed)",
                color: "#fff",
                border: "none",
                fontWeight: 500,
                cursor: busy || !isDirty ? "not-allowed" : "pointer",
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
        }
      >
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={subsectionHeadingRow}>
            <h3 id="builtin-heading" style={subsectionTitleStyle}>
              Built-in columns
            </h3>
          </div>
          <p style={subsectionHintStyle}>
            Standard, pre-defined volunteer table columns from the database.
          </p>
          <div>
            {builtInRows.map((row) => (
              <ColumnToggleRow
                key={row.id}
                row={row}
                isHidden={hidden.has(row.id)}
                disabled={busy}
                onToggle={() => toggle(row.id)}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid #f3f4f6",
            paddingTop: "1.25rem",
            marginTop: "0.25rem",
          }}
        >
          <div style={subsectionHeadingRow}>
            <h3 id="custom-hide-heading" style={subsectionTitleStyle}>
              Custom columns
            </h3>
          </div>
          <p style={subsectionHintStyle}>
            Columns created by admin users. Hiding does not delete stored data.
          </p>
          {customRows.length === 0 ? (
            <p
              style={{
                fontSize: "0.875rem",
                color: "#737373",
                margin: "0 0 0.5rem",
              }}
            >
              No custom columns yet. Create one in the panel below; it will
              appear here for visibility control.
            </p>
          ) : (
            <div>
              {customRows.map((row) => (
                <ColumnToggleRow
                  key={row.id}
                  row={row}
                  isHidden={hidden.has(row.id)}
                  disabled={busy}
                  onToggle={() => toggle(row.id)}
                />
              ))}
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        sectionId="create-column-heading"
        title="Create custom column"
        description="Adds a new column to the volunteers table for all signed-in users. Adding a column makes it visible for everyone, not just you."
        icon={
          <Plus
            style={{
              width: 18,
              height: 18,
              color: "var(--trcc-purple, #7c3aed)",
            }}
            aria-hidden
          />
        }
        footer={
          <div style={panelFooterRowStyle}>
            <span
              style={{
                marginRight: "auto",
                fontSize: "0.8125rem",
                color: "#737373",
              }}
            >
              Columns are created immediately when you click the button.
            </span>
            <button
              type="button"
              onClick={() => void handleCreateCustomColumn()}
              disabled={busy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: busy
                  ? "#d4d4d4"
                  : "var(--trcc-purple, #7c3aed)",
                color: "#fff",
                fontWeight: 500,
                fontSize: "0.875rem",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {creating ? (
                <>
                  <Loader2
                    style={{ width: 16, height: 16 }}
                    className="animate-spin"
                    aria-hidden
                  />
                  Creating…
                </>
              ) : (
                "Create column"
              )}
            </button>
          </div>
        }
      >
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            maxWidth: "28rem",
          }}
        >
          <div>
            <label htmlFor="table-mgmt-new-name" style={fieldLabelStyle}>
              Column name
            </label>
            <input
              id="table-mgmt-new-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={busy}
              placeholder="e.g. T-shirt size"
              style={fieldControlStyle}
            />
          </div>
          <div>
            <label htmlFor="table-mgmt-new-type" style={fieldLabelStyle}>
              Data type
            </label>
            <select
              id="table-mgmt-new-type"
              value={newType}
              onChange={(e) =>
                setNewType(e.target.value as NewCustomColumnInput["data_type"])
              }
              disabled={busy}
              style={fieldControlStyle}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Yes / No</option>
              <option value="tag">Tag</option>
            </select>
          </div>
          {newType === "tag" && (
            <>
              <div>
                <label htmlFor="table-mgmt-tag-options" style={fieldLabelStyle}>
                  Tag options (optional)
                </label>
                <textarea
                  id="table-mgmt-tag-options"
                  value={tagOptionsRaw}
                  onChange={(e) => setTagOptionsRaw(e.target.value)}
                  disabled={busy}
                  placeholder="Comma or newline separated"
                  rows={2}
                  style={{ ...fieldControlStyle, resize: "vertical" }}
                />
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#404040",
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={tagMulti}
                  disabled={busy}
                  onChange={(e) => setTagMulti(e.target.checked)}
                />
                Allow multiple tags
              </label>
            </>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        sectionId="delete-column-heading"
        title="Remove custom columns"
        description={
          <>
            Permanently deletes a column and <strong>all</strong> values stored
            for that field on every volunteer. Built-in columns cannot be
            removed here.
          </>
        }
        iconFrameStyle={{ backgroundColor: "#ffe4e6" }}
        icon={
          <Trash2
            style={{ width: 18, height: 18, color: "#e11d48" }}
            aria-hidden
          />
        }
      >
        {customColumns.length === 0 ? (
          <p
            style={{
              fontSize: "0.875rem",
              color: "#737373",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            There are no custom columns to remove.
          </p>
        ) : (
          <div>
            {customColumns.map((c) => (
              <CustomColumnDeleteRow
                key={c.id}
                column={c}
                disabled={busy}
                onRequestRemove={() => setConfirmDeleteColumn(c)}
              />
            ))}
          </div>
        )}
      </SettingsSection>

      {confirmDeleteColumn && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: "rgba(0, 0, 0, 0.45)",
          }}
          role="presentation"
          onClick={() => {
            if (!deleting) setConfirmDeleteColumn(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-col-confirm-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !deleting) setConfirmDeleteColumn(null);
            }}
            style={{
              width: "100%",
              maxWidth: "26rem",
              padding: "1.25rem",
              borderRadius: "10px",
              backgroundColor: "#fff",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: "#e5e5e5",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
            }}
          >
            <h3
              id="delete-col-confirm-title"
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#171717",
                margin: "0 0 0.5rem",
              }}
            >
              Remove column?
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#525252",
                lineHeight: 1.5,
                margin: "0 0 0.75rem",
              }}
            >
              <strong>{confirmDeleteColumn.name}</strong> (
              {tableIdForCustomColumn(confirmDeleteColumn.column_key)}) and all
              of its data will be removed from the database. This cannot be
              undone.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmDeleteColumn(null)}
                disabled={deleting}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: "#d4d4d4",
                  backgroundColor: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#404040",
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteColumn()}
                disabled={deleting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: deleting ? "#fca5a5" : "#dc2626",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                {deleting ? (
                  <>
                    <Loader2
                      style={{ width: 16, height: 16 }}
                      className="animate-spin"
                      aria-hidden
                    />
                    Removing…
                  </>
                ) : (
                  "Remove permanently"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
