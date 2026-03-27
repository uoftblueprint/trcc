"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ManageStaffTable, type StaffRow } from "./ManageStaffTable";
import { NewUserModal } from "./NewUserModal";
import { updateUserAction } from "@/lib/api/actions";

type ManageStaffContentProps = {
  initialData: StaffRow[];
  loadError: string | null;
};

export function ManageStaffContent({
  initialData,
  loadError,
}: ManageStaffContentProps): React.JSX.Element {
  // Committed data: what is currently saved in the DB (plus any new rows added via modal)
  const [committedData, setCommittedData] = useState<StaffRow[]>(initialData);
  // Pending edits: buffered cell changes not yet saved, keyed by row ID
  const [pendingEdits, setPendingEdits] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasPendingEdits = Object.keys(pendingEdits).some(
    (id) => Object.keys(pendingEdits[id] ?? {}).length > 0
  );

  // Display data merges committed state with pending edits
  const displayData = useMemo<StaffRow[]>(
    () =>
      committedData.map((row) => {
        const edits = pendingEdits[row.id];
        if (!edits) return row;
        return {
          ...row,
          ...(edits["name"] !== undefined
            ? { name: edits["name"] as string }
            : {}),
          ...(edits["email"] !== undefined
            ? { email: edits["email"] as string }
            : {}),
          ...(edits["password"] !== undefined
            ? { password: edits["password"] as string }
            : {}),
          ...(edits["memberType"] !== undefined
            ? { memberType: edits["memberType"] as StaffRow["memberType"] }
            : {}),
        };
      }),
    [committedData, pendingEdits]
  );

  const onCellEdit = useCallback(
    (rowIndex: number, columnId: string, value: unknown) => {
      const row = committedData[rowIndex];
      if (!row) return;
      setSaveError(null);
      setPendingEdits((prev) => ({
        ...prev,
        [row.id]: {
          ...(prev[row.id] ?? {}),
          [columnId]: value,
        },
      }));
    },
    [committedData]
  );

  const handleCancel = useCallback(() => {
    setPendingEdits({});
    setSaveError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasPendingEdits) return;
    setIsSaving(true);
    setSaveError(null);

    const errors: string[] = [];
    const savedIds = new Set<string>();

    for (const [rowId, changes] of Object.entries(pendingEdits)) {
      if (Object.keys(changes).length === 0) continue;

      // Only try to update users that exist in committed data (not new/unsaved rows)
      const committedRow = committedData.find((r) => r.id === rowId);
      if (!committedRow) continue;

      // Build the body for updateUser: name, email, password, role
      const body: Record<string, string> = {};

      if (
        changes["name"] !== undefined &&
        typeof changes["name"] === "string"
      ) {
        body["name"] = changes["name"];
      }
      if (
        changes["email"] !== undefined &&
        typeof changes["email"] === "string"
      ) {
        body["email"] = changes["email"];
      }
      if (
        changes["password"] !== undefined &&
        typeof changes["password"] === "string" &&
        changes["password"].length >= 6
      ) {
        body["password"] = changes["password"];
      }
      if (
        changes["memberType"] !== undefined &&
        changes["memberType"] !== "No role"
      ) {
        body["role"] = (changes["memberType"] as string).toLowerCase();
      }

      if (Object.keys(body).length === 0) {
        // Nothing meaningful to send (e.g. only a short password attempt)
        savedIds.add(rowId);
        continue;
      }

      try {
        const result = await updateUserAction(rowId, body);
        if (result.error) {
          errors.push(`${committedRow.email || rowId}: ${result.error}`);
        } else {
          savedIds.add(rowId);
          // Apply saved changes to committedData
          setCommittedData((prev) =>
            prev.map((row) => {
              if (row.id !== rowId) return row;
              return {
                ...row,
                ...(body["name"] !== undefined ? { name: body["name"] } : {}),
                ...(body["email"] !== undefined
                  ? { email: body["email"] }
                  : {}),
                ...(body["role"] !== undefined
                  ? {
                      memberType: (body["role"] === "admin"
                        ? "Admin"
                        : "Staff") as StaffRow["memberType"],
                    }
                  : {}),
                password: "",
              };
            })
          );
        }
      } catch (err) {
        errors.push(
          `${committedRow.email || rowId}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    if (errors.length > 0) {
      setSaveError(errors.join(" · "));
      // Remove successfully saved rows from pending edits
      if (savedIds.size > 0) {
        setPendingEdits((prev) => {
          const next = { ...prev };
          savedIds.forEach((id) => delete next[id]);
          return next;
        });
      }
    } else {
      setPendingEdits({});
    }

    setIsSaving(false);
  }, [hasPendingEdits, pendingEdits, committedData]);

  const handleAddUser = useCallback((user: Omit<StaffRow, "id">) => {
    const newRow: StaffRow = {
      ...user,
      id: crypto.randomUUID(),
    };
    setCommittedData((prev) => [...prev, newRow]);
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#171717",
          }}
        >
          Manage Staff
        </h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            backgroundColor: "var(--trcc-purple)",
            color: "#fff",
            border: "none",
            fontWeight: 500,
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          <span aria-hidden>+</span>
          New User
        </button>
      </div>

      {loadError && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            borderRadius: "6px",
            fontSize: "0.875rem",
          }}
        >
          {"Error loading users: " + loadError}
        </div>
      )}

      <ManageStaffTable
        data={displayData}
        pendingEdits={pendingEdits}
        onCellEdit={onCellEdit}
      />

      <NewUserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddUser}
      />

      {/* Save / Cancel bar */}
      {hasPendingEdits && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            border: "1px solid #e5e5e5",
            padding: "0.75rem 1rem",
          }}
        >
          {saveError && (
            <span
              style={{
                color: "#dc2626",
                fontSize: "0.75rem",
                maxWidth: "20rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {saveError}
            </span>
          )}
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              color: "#374151",
              fontWeight: 500,
              cursor: isSaving ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--trcc-purple)",
              color: "#fff",
              fontWeight: 500,
              cursor: isSaving ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
