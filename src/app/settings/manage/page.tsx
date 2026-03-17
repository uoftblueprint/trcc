import { getUsers } from "@/lib/api";
import type { StaffRow } from "../../../components/settings/ManageStaffTable";
import { ManageStaffContent } from "../../../components/settings/ManageStaffContent";

const EMAIL_NOT_FOUND_PLACEHOLDER = "—";

function mapUserToStaffRow(user: {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "admin" | "staff" | null;
}): StaffRow {
  const memberType: StaffRow["memberType"] =
    user.role === "admin" ? "Admin" : "Staff";
  const name = user.name ?? user.email ?? "";
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

export default async function ManageStaffPage(): Promise<React.JSX.Element> {
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
