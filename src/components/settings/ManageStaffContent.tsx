"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Users, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useUser } from "@/lib/client/userContext";
import { ManageStaffTable, type StaffRow } from "./ManageStaffTable";
import { NewUserModal } from "./NewUserModal";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from "@/lib/api/actions";
import { ChangePasswordModal } from "./ChangePasswordModal";
import {
  updateUserPasswordAction,
  updateUserAction,
  removeUserAction,
} from "@/lib/api/actions";

const MEMBER_TYPE_TO_ROLE: Record<StaffRow["memberType"], string | null> = {
  Admin: "admin",
  Staff: "staff",
  "No role": null,
};

type FieldChange = {
  field: string;
  from: string;
  to: string;
};

type UserChange = {
  userId: string;
  label: string;
  changes: FieldChange[];
};

function computeChanges(
  original: StaffRow[],
  current: StaffRow[]
): UserChange[] {
  const originalById = new Map(original.map((r) => [r.id, r]));
  const result: UserChange[] = [];

  for (const row of current) {
    const orig = originalById.get(row.id);
    if (!orig) continue;

    const changes: FieldChange[] = [];

    if (row.name !== orig.name) {
      changes.push({
        field: "Name",
        from: orig.name || "(empty)",
        to: row.name || "(empty)",
      });
    }
    if (row.email !== orig.email) {
      changes.push({ field: "Email", from: orig.email, to: row.email });
    }
    if (row.memberType !== orig.memberType) {
      changes.push({
        field: "Role",
        from: orig.memberType,
        to: row.memberType,
      });
    }

    if (changes.length > 0) {
      result.push({
        userId: row.id,
        label: row.name || row.email || row.id,
        changes,
      });
    }
  }

  return result;
}

type ManageStaffContentProps = {
  initialData: StaffRow[];
  loadError: string | null;
};

export function ManageStaffContent({
  initialData,
  loadError,
}: ManageStaffContentProps): React.JSX.Element {
  const { user: currentUser } = useUser();
  const [savedData, setSavedData] = useState<StaffRow[]>(initialData);
  const [staffList, setStaffList] = useState<StaffRow[]>(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<StaffRow | null>(null);
  const [saving, setSaving] = useState(false);

  const pendingChanges = useMemo(
    () => computeChanges(savedData, staffList),
    [savedData, staffList]
  );
  const hasChanges = pendingChanges.length > 0;

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

  const handleDiscard = useCallback(() => {
    setStaffList(savedData);
  }, [savedData]);

  const handleSave = useCallback(async () => {
    if (pendingChanges.length === 0) return;

    const summary = pendingChanges
      .map(
        (u) =>
          `${u.label}:\n` +
          u.changes
            .map((c) => `  ${c.field}: "${c.from}" → "${c.to}"`)
            .join("\n")
      )
      .join("\n\n");

    const confirmed = window.confirm(
      `Save the following changes?\n\n${summary}`
    );
    if (!confirmed) return;

    setSaving(true);
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const change of pendingChanges) {
      const current = staffList.find((r) => r.id === change.userId);
      if (!current) continue;

      const patch: { name?: string; email?: string; role?: string } = {};

      for (const c of change.changes) {
        if (c.field === "Name") patch.name = current.name;
        if (c.field === "Email") patch.email = current.email;
        if (c.field === "Role") {
          const role = MEMBER_TYPE_TO_ROLE[current.memberType];
          if (role) patch.role = role;
        }
      }

      const result = await updateUserAction(change.userId, patch);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
        errors.push(`${change.label}: ${result.error}`);
      }
    }

    setSaving(false);

    if (failed === 0) {
      toast.success(
        succeeded === 1
          ? "User updated successfully."
          : `${succeeded} users updated successfully.`
      );
      setSavedData([...staffList]);
    } else {
      toast.error(`${failed} update(s) failed:\n${errors.join("\n")}`, {
        duration: 6000,
      });
    }
  }, [pendingChanges, staffList]);

  const handleRemoveUser = useCallback(async (user: StaffRow) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${user.name || user.email}? This action cannot be undone.`
    );
    if (!confirmed) return;

    const result = await removeUserAction(user.id);
    if (!result.success) {
      toast.error(result.error ?? "Failed to remove user.");
      return;
    }

    setStaffList((prev) => prev.filter((row) => row.id !== user.id));
    setSavedData((prev) => prev.filter((row) => row.id !== user.id));
    toast.success("User removed successfully.");
  }, []);

  const handlePasswordChange = useCallback(
    async (userId: string, password: string) => {
      const result = await updateUserPasswordAction(userId, password);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update password.");
      }

      if (currentUser?.id === userId) {
        toast.success(
          "Your password was updated. Please reload the page and log in again.",
          { duration: Infinity }
        );
      } else {
        toast.success("Password updated successfully.");
      }
    },
    [currentUser?.id]
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
            <Users
              style={{
                width: 20,
                height: 20,
                color: "var(--trcc-purple, #7c3aed)",
              }}
            />
          </div>
          <div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#171717",
                  margin: 0,
                }}
              >
                Manage Staff
              </h1>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#525252",
                  backgroundColor: "#f5f5f5",
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}
              >
                {staffList.length}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#737373",
                margin: "0.125rem 0 0",
              }}
            >
              Add, edit, or remove staff accounts and roles.
            </p>
          </div>
        </div>
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
          <UserPlus style={{ width: 16, height: 16 }} aria-hidden />
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
        onPasswordClick={setPasswordUser}
        onRemoveClick={handleRemoveUser}
        currentUserId={currentUser?.id}
      />

      {hasChanges && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "0.75rem",
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
          }}
        >
          <span
            style={{
              marginRight: "auto",
              fontSize: "0.875rem",
              color: "#92400e",
              fontWeight: 500,
            }}
          >
            {pendingChanges.length === 1
              ? "1 user has unsaved changes"
              : `${pendingChanges.length} users have unsaved changes`}
          </span>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={saving}
            style={{
              padding: "0.4rem 0.875rem",
              borderRadius: "6px",
              border: "1px solid #e5e5e5",
              backgroundColor: "#fff",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              color: "#525252",
              opacity: saving ? 0.6 : 1,
            }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "0.4rem 0.875rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "var(--trcc-purple)",
              color: "#fff",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      <NewUserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddUser}
      />
      <ChangePasswordModal
        isOpen={passwordUser !== null}
        user={passwordUser}
        onClose={() => setPasswordUser(null)}
        onSubmit={handlePasswordChange}
      />
    </div>
  );
}
