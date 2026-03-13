import { SettingsNav } from "@/components/settings/SettingsNav";

const panelShadow = "0 1px 3px rgba(0,0,0,0.2)";

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        backgroundColor: "#e8e8e8",
      }}
    >
      <aside
        style={{
          width: "260px",
          flexShrink: 0,
          minHeight: "100vh",
          backgroundColor: "#fff",
          boxShadow: panelShadow,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SettingsNav />
      </aside>
      <main
        style={{
          flex: 1,
          minHeight: "100vh",
          backgroundColor: "#fff",
          boxShadow: panelShadow,
          padding: "2rem",
          overflow: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
