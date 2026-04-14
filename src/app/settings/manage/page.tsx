import { redirect } from "next/navigation";
import { getUsers } from "@/lib/api";
import type { StaffRow } from "../../../components/settings/ManageStaffTable";
import { ManageStaffContent } from "../../../components/settings/ManageStaffContent";
import { getCurrentUserServer } from "@/lib/api/getCurrentUserServer";

const EMAIL_NOT_FOUND_PLACEHOLDER = "—";

function mapUserToStaffRow(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "admin" | "staff" | null;
}): StaffRow {
  const memberType: StaffRow["memberType"] =
    user.role === "admin"
      ? "Admin"
      : user.role === "staff"
        ? "Staff"
        : "No role";
  const name = user.name ?? "";
  const email =
    typeof user.email === "string" && user.email !== ""
      ? user.email
      : EMAIL_NOT_FOUND_PLACEHOLDER;
  return {
    id: user.id,
    name,
    email,
    password: "",
    memberType,
  };
}

function canManageStaff(role: "admin" | "staff" | null): role is "admin" {
  return role === "admin";
}

function NoProfileMessage(): React.JSX.Element {
  return (
    <div style={{ maxWidth: "36rem" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#171717",
          marginBottom: "0.75rem",
        }}
      >
        Manage Users
      </h1>
      <p style={{ color: "#525252", lineHeight: 1.5 }}>
        We couldn’t load your profile. Try signing out and back in. If this
        continues, your account may need to be updated. Contact the
        administrator or someone who can access the database.
      </p>
    </div>
  );
}

function AccessDeniedMessage({
  role,
}: {
  role: "admin" | "staff" | null;
}): React.JSX.Element {
  return (
    <div style={{ maxWidth: "36rem" }}>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "#171717",
          marginBottom: "0.75rem",
        }}
      >
        Manage Users
      </h1>
      <p style={{ color: "#525252", lineHeight: 1.5 }}>
        {role === "staff"
          ? "Only administrators can manage users."
          : "Your account doesn’t have a role yet (admin or staff). Ask someone who can edit the database to update your role."}
      </p>
    </div>
  );
}

export default async function ManageStaffPage(): Promise<React.JSX.Element> {
  const currentUser = await getCurrentUserServer();
  if (!currentUser) {
    return <NoProfileMessage />;
  }
  if (currentUser.role === "staff") {
    redirect("/settings/account");
  }
  if (!canManageStaff(currentUser.role)) {
    return <AccessDeniedMessage role={currentUser.role} />;
  }

  let initialData: StaffRow[] = [];
  let loadError: string | null = null;

  try {
    const users = await getUsers();
    initialData = users.map(mapUserToStaffRow);
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return <ManageStaffContent initialData={initialData} loadError={loadError} />;
}
