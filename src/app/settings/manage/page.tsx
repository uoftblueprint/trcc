import { ManageStaffTable } from "./ManageStaffTable";

export default function ManageStaffPage(): React.JSX.Element {
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
      <ManageStaffTable />
    </div>
  );
}
