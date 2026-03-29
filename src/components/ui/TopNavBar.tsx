"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut, MoreVertical, Settings, UserCircle } from "lucide-react";
import { createClient } from "@/lib/client/supabase/client";
import { useUser } from "@/lib/client/userContext";
import { getCurrentUser } from "@/lib/api/getCurrentUser";
import type { Database } from "@/lib/client/supabase/types";

type UserRow = Database["public"]["Tables"]["Users"]["Row"];

export function TopNavBar(): React.JSX.Element {
  const { user } = useUser();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch current user data (name, role) from Users table
  useEffect(() => {
    if (!user) return;
    getCurrentUser()
      .then(setCurrentUser)
      .catch(() => {});
  }, [user]);

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
    pathname.startsWith("/forgot-password")
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
        padding: "20px 40px",
        backgroundColor: "#fff",
        borderBottom: "1px solid var(--color-border, #d4e3ee)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <Link href="/volunteers">
        <Image
          src="/trcc-logo.png"
          alt="Toronto Rape Crisis Centre"
          width={100}
          height={40}
          style={{ objectFit: "contain" }}
          priority
        />
      </Link>

      {/* User profile menu */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 12px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: menuOpen
              ? "var(--trcc-light-purple, #e9ddee)"
              : "var(--trcc-light-purple, #e9ddee)",
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
        >
          <UserCircle
            style={{ width: 32, height: 32, color: "#737373" }}
            strokeWidth={1.5}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#171717",
                lineHeight: 1.3,
              }}
            >
              {currentUser?.name || user?.email || "User"}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 400,
                color: "#737373",
                lineHeight: 1.3,
              }}
            >
              {currentUser?.role === "admin"
                ? "Administrator"
                : currentUser?.role === "staff"
                  ? "Staff"
                  : ""}
            </span>
          </div>
          <MoreVertical style={{ width: 18, height: 18, color: "#737373" }} />
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
              href="/settings/account"
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
