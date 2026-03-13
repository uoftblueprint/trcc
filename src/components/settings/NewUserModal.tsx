"use client";

import React, { useCallback, useState, useEffect } from "react";
import { Type, Mail, Lock, UserCircle, X } from "lucide-react";
import type { StaffRow } from "./ManageStaffTable";

const MEMBER_TYPES: StaffRow["memberType"][] = ["Admin", "Staff"];

const fieldStyle = {
  display: "flex" as const,
  alignItems: "center",
  gap: "0.75rem",
  marginBottom: "1rem",
};
const labelStyle = {
  flexShrink: 0,
  width: "120px",
  fontWeight: 500,
  color: "#171717",
  fontSize: "0.875rem",
};
const inputStyle = {
  flex: 1,
  padding: "0.5rem 0.75rem",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  backgroundColor: "#fafafa",
  fontSize: "0.875rem",
  color: "#171717",
};
const iconStyle = { width: 20, height: 20, color: "#737373", flexShrink: 0 };

type NewUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (user: Omit<StaffRow, "id">) => void;
};

export function NewUserModal({
  isOpen,
  onClose,
  onSubmit,
}: NewUserModalProps): React.JSX.Element | null {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberType, setMemberType] = useState<StaffRow["memberType"]>("Staff");

  const reset = useCallback(() => {
    setName("");
    setEmail("");
    setPassword("");
    setMemberType("Staff");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({
        name: name.trim(),
        email: email.trim(),
        password,
        memberType,
      });
      reset();
      onClose();
    },
    [name, email, password, memberType, onSubmit, reset, onClose]
  );

  useEffect((): (() => void) | undefined => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return (): void => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        role="presentation"
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 50,
        }}
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-user-modal-title"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#f5f5f5",
          borderRadius: "12px",
          boxShadow:
            "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
          zIndex: 51,
          padding: "1.5rem 1.5rem 1.5rem 1.5rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <h2
            id="new-user-modal-title"
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#171717",
            }}
          >
            New User
          </h2>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#737373",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          >
            <X style={{ width: 24, height: 24 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <Type style={iconStyle} aria-hidden />
            <label htmlFor="new-user-name" style={labelStyle}>
              Name
            </label>
            <input
              id="new-user-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Empty"
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <Mail style={iconStyle} aria-hidden />
            <label htmlFor="new-user-email" style={labelStyle}>
              Email
            </label>
            <input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Empty"
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldStyle}>
            <Lock style={iconStyle} aria-hidden />
            <label htmlFor="new-user-password" style={labelStyle}>
              Password
            </label>
            <input
              id="new-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Empty"
              style={inputStyle}
              required
            />
          </div>

          <div style={fieldStyle}>
            <UserCircle style={iconStyle} aria-hidden />
            <label htmlFor="new-user-member-type" style={labelStyle}>
              Member Type
            </label>
            <select
              id="new-user-member-type"
              value={memberType}
              onChange={(e) =>
                setMemberType(e.target.value as StaffRow["memberType"])
              }
              style={{
                ...inputStyle,
                cursor: "pointer",
                backgroundColor: "#fff",
              }}
            >
              {MEMBER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "1.5rem",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                backgroundColor: "#fff",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
                color: "#525252",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                backgroundColor: "var(--trcc-purple)",
                color: "#fff",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Add User
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
