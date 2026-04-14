"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/api/getCurrentUser";

const BASE_NAV_ITEMS = [
  { href: "/settings/account", label: "Account Info" },
] as const;

const ADMIN_NAV_ITEM = {
  href: "/settings/manage",
  label: "Manage Users",
} as const;

export function SettingsNav(): React.JSX.Element {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setIsAdmin(u.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  const navItems =
    isAdmin === true
      ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
      : [...BASE_NAV_ITEMS];

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
      {navItems.map(({ href, label }) => {
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
              borderRadius: "6px",
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
