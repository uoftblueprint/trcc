import { getCurrentUserServer } from "@/lib/api/getCurrentUserServer";
import { listCustomColumns } from "@/lib/api/customColumns";
import { getVolunteerTableGlobalSettings } from "@/lib/api/volunteerTableGlobalSettings";
import { TableManagementContent } from "@/components/settings/TableManagementContent";

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
        Table Management
      </h1>
      <p style={{ color: "#525252", lineHeight: 1.5 }}>
        We couldn’t load your profile. Try signing out and back in.
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
        Table Management
      </h1>
      <p style={{ color: "#525252", lineHeight: 1.5 }}>
        {role === "staff"
          ? "Only administrators can change which columns are hidden for all users."
          : "Your account doesn’t have a role yet (admin or staff)."}
      </p>
    </div>
  );
}

export default async function TableManagementPage(): Promise<React.JSX.Element> {
  const currentUser = await getCurrentUserServer();
  if (!currentUser) {
    return <NoProfileMessage />;
  }
  if (currentUser.role !== "admin") {
    return <AccessDeniedMessage role={currentUser.role} />;
  }

  const [global, customColumns] = await Promise.all([
    getVolunteerTableGlobalSettings(),
    listCustomColumns(),
  ]);

  return (
    <TableManagementContent
      initialAdminHidden={global.admin_hidden_columns}
      customColumns={customColumns}
    />
  );
}
