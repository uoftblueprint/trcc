import { SettingsNav } from "@/components/settings/SettingsNav";

const panelShadow = "0 1px 3px rgba(0,0,0,0.2)";
const NAVBAR_HEIGHT = "105px";

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <div
      style={{
        minHeight: `calc(100vh - ${NAVBAR_HEIGHT})`,
        display: "flex",
        flexDirection: "row",
        backgroundColor: "#e8e8e8",
      }}
    >
      <aside
        style={{
          width: "260px",
          flexShrink: 0,
          height: `calc(100vh - ${NAVBAR_HEIGHT})`,
          backgroundColor: "#fff",
          boxShadow: panelShadow,
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: NAVBAR_HEIGHT,
          paddingTop: "1rem",
          paddingBottom: "1rem",
          overflowY: "auto",
        }}
      >
        <SettingsNav />
      </aside>
      <main
        style={{
          flex: 1,
          height: `calc(100vh - ${NAVBAR_HEIGHT})`,
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
