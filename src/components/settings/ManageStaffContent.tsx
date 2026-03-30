"use client";

import React, { useCallback, useState } from "react";
import { ManageStaffTable, type StaffRow } from "./ManageStaffTable";
import { NewUserModal } from "./NewUserModal";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from "@/lib/api/actions";

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
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleUpdateUser = useCallback(
    async (userId: string, field: string, value: unknown) => {
      setActionError(null);
      // Map memberType display value to the role field expected by the API
      let apiField = field;
      let apiValue = value;
      if (field === "memberType") {
        apiField = "role";
        apiValue =
          (value as string).toLowerCase() === "no role"
            ? null
            : (value as string).toLowerCase();
      }
      if (
        apiField === "password" &&
        (!apiValue || (apiValue as string).length === 0)
      ) {
        return; // skip empty password updates
      }
      const result = await updateUserAction(userId, { [apiField]: apiValue });
      if (result.error) {
        setActionError(result.error);
      }
    },
    []
  );

  const handleDeleteUser = useCallback(async (userId: string) => {
    setActionError(null);
    const result = await deleteUserAction(userId);
    if (result.success) {
      setStaffList((prev) => prev.filter((u) => u.id !== userId));
    } else {
      setActionError(result.error ?? "Failed to delete user");
    }
  }, []);

  const handleAddUser = useCallback(async (user: Omit<StaffRow, "id">) => {
    setCreateError(null);
    const role =
      user.memberType === "Admin" ? ("admin" as const) : ("staff" as const);
    const result = await createUserAction({
      name: user.name,
      email: user.email,
      password: user.password,
      role,
    });

    if (result.success) {
      const newRow: StaffRow = {
        ...user,
        id: result.data.id,
      };
      setStaffList((prev) => [...prev, newRow]);
    } else {
      const details = result.validationErrors
        ?.map((e) => `${e.field}: ${e.message}`)
        .join(", ");
      setCreateError(details ? `${result.error} (${details})` : result.error);
    }
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
      {(createError || actionError) && (
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
          {createError
            ? "Error creating user: " + createError
            : "Error: " + actionError}
        </div>
      )}
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
        data={staffList}
        onDataChange={setStaffList}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />
      <NewUserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddUser}
      />
    </div>
  );
}
