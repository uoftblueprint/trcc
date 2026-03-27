"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/client/supabase/client";
import { useUser } from "@/lib/client/userContext";

export function TopNavBar(): React.JSX.Element {
  const { user } = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return (): void =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Don't show nav on login or auth pages
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/update-password")
  ) {
    return <></>;
  }

  const handleLogout = async (): Promise<void> => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "64px",
        padding: "0 24px",
        backgroundColor: "#fff",
        borderBottom: "1px solid var(--color-border, #d4e3ee)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <Link
        href="/volunteers"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "var(--trcc-purple, #78468c)",
            letterSpacing: "-0.02em",
          }}
        >
          TRCC
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "var(--color-neutral-500, #7082a8)",
          }}
        >
          Dashboard
        </span>
      </Link>

      {/* Settings menu */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid transparent",
            backgroundColor: menuOpen
              ? "var(--trcc-light-purple, #e9ddee)"
              : "transparent",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--foreground, #171717)",
            transition: "background-color 0.15s ease",
          }}
        >
          <Settings style={{ width: 18, height: 18 }} />
          {user?.email && (
            <span
              style={{
                maxWidth: "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </span>
          )}
          <ChevronDown
            style={{
              width: 14,
              height: 14,
              transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          />
        </button>

        {menuOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 4px)",
              minWidth: "180px",
              backgroundColor: "#fff",
              border: "1px solid var(--color-border, #d4e3ee)",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              padding: "4px",
              zIndex: 50,
            }}
          >
            <Link
              href="/settings/manage"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#171717",
                textDecoration: "none",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent";
              }}
            >
              <Settings style={{ width: 16, height: 16, color: "#737373" }} />
              Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "0.875rem",
                color: "#171717",
                width: "100%",
                textAlign: "left",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "transparent";
              }}
            >
              <LogOut style={{ width: 16, height: 16, color: "#737373" }} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
