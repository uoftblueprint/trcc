"use client";

import React, { useCallback, useState } from "react";
import { ManageStaffTable, type StaffRow } from "./ManageStaffTable";
import { NewUserModal } from "./NewUserModal";

type ManageStaffContentProps = {
  initialData: StaffRow[];
  loadError: string | null;
};

export function ManageStaffContent({
  initialData,
  loadError,
}: ManageStaffContentProps): React.JSX.Element {
  const [staffList, setStaffList] = useState<StaffRow[]>(initialData);
  const [modalOpen, setModalOpen] = useState(false);

  const handleAddUser = useCallback((user: Omit<StaffRow, "id">) => {
    const newRow: StaffRow = {
      ...user,
      id: crypto.randomUUID(),
    };
    setStaffList((prev) => [...prev, newRow]);
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
      <ManageStaffTable data={staffList} onDataChange={setStaffList} />
      <NewUserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddUser}
      />
    </div>
  );
}
