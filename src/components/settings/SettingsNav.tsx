"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings/account", label: "Account Info" },
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
              padding: "0.625rem 1rem",
              border: !isActive ? "1px solid #d9dee8" : "none",
              borderRadius: !isActive ? "6px" : "none",
              backgroundColor: isActive
                ? "var(--trcc-light-purple)"
                : "transparent",
              color: "#171717",
              fontWeight: 500,
              textDecoration: "none",
              fontSize: "0.875rem",
              marginBottom: "0.5rem",
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
          fontSize: "0.875rem",
        }}
      >
        Back to dashboard
      </Link>
    </nav>
  );
}
