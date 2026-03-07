import { getUsers } from "@/lib/api";
import { ManageStaffTable } from "./ManageStaffTable";
import type { StaffRow } from "./ManageStaffTable";

function mapUserToStaffRow(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "admin" | "staff" | null;
}): StaffRow {
  const memberType: StaffRow["memberType"] =
    user.role === "admin" ? "Admin" : "Staff";
  const name = user.name ?? user.email ?? "";
  return {
    id: user.id,
    name,
    email: typeof user.email === "string" ? user.email : "",
    password: "",
    memberType,
  };
}

export default async function ManageStaffPage(): Promise<React.JSX.Element> {
  let initialData: StaffRow[] = [];
  let loadError: string | null = null;

  try {
    const users = await getUsers();
    initialData = users.map(mapUserToStaffRow);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

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
      <ManageStaffTable initialData={initialData} />
    </div>
  );
}
