"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/manage", label: "Manage Staff" },
] as const;

export function SettingsNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "1.25rem 1rem",
        gap: "0.25rem",
      }}
    >
      <h2
        style={{
          fontWeight: 700,
          fontSize: "1rem",
          color: "#171717",
          marginBottom: "1rem",
        }}
      >
        Settings
      </h2>
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive =
          pathname === href ||
          pathname.startsWith(href + "/") ||
          (href === "/settings/account" && pathname === "/settings");
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: "block",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: isActive
                ? "var(--trcc-light-purple)"
                : "transparent",
              color: "#171717",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {label}
          </Link>
        );
      })}
      <div style={{ flex: 1, minHeight: "1rem" }} />
      <Link
        href="/volunteers"
        style={{
          display: "block",
          padding: "0.625rem 1rem",
          borderRadius: "6px",
          backgroundColor: "var(--trcc-purple)",
          color: "#fff",
          fontWeight: 500,
          textAlign: "center",
          textDecoration: "none",
          marginTop: "auto",
        }}
      >
        Back to dashboard
      </Link>
    </nav>
  );
}
