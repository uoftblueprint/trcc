"use client";

import React, { useCallback, useState, useEffect } from "react";
import { notifyIfForbiddenError } from "@/lib/client/forbiddenOperationToast";
import { Lock, X, User, Mail } from "lucide-react";
import type { StaffRow } from "./ManageStaffTable";

const fieldStyle = {
  display: "flex" as const,
  alignItems: "center",
  gap: "0.75rem",
  marginBottom: "1rem",
};
const labelStyle = {
  flexShrink: 0,
  width: "140px",
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
const infoValueStyle = {
  flex: 1,
  minWidth: 0,
  fontSize: "0.875rem",
  color: "#171717",
  overflow: "hidden" as const,
  textOverflow: "ellipsis" as const,
  whiteSpace: "nowrap" as const,
};
const iconStyle = { width: 20, height: 20, color: "#737373", flexShrink: 0 };

type ChangePasswordModalProps = {
  isOpen: boolean;
  user: StaffRow | null;
  onClose: () => void;
  onSubmit: (userId: string, password: string) => Promise<void>;
};

export function ChangePasswordModal({
  isOpen,
  user,
  onClose,
  onSubmit,
}: ChangePasswordModalProps): React.JSX.Element | null {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setPassword("");
    setConfirmPassword("");
    setError("");
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      if (!user) return;

      setLoading(true);
      try {
        await onSubmit(user.id, password);
        reset();
        onClose();
      } catch (err) {
        if (notifyIfForbiddenError(err)) {
          setError("");
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to update password."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [password, confirmPassword, user, onSubmit, reset, onClose]
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

  if (!isOpen || !user) return null;

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
        aria-labelledby="change-password-modal-title"
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
          padding: "1.5rem",
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
            id="change-password-modal-title"
            style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#171717",
            }}
          >
            Change Password
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
            }}
          >
            <X style={{ width: 24, height: 24 }} />
          </button>
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            border: "1px solid #e5e5e5",
          }}
        >
          <div style={{ ...fieldStyle, marginBottom: "0.5rem" }}>
            <User style={iconStyle} aria-hidden />
            <span style={labelStyle}>Name</span>
            <span style={infoValueStyle}>{user.name || "—"}</span>
          </div>
          <div style={{ ...fieldStyle, marginBottom: 0 }}>
            <Mail style={iconStyle} aria-hidden />
            <span style={labelStyle}>Email</span>
            <span style={infoValueStyle}>{user.email || "—"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <Lock style={iconStyle} aria-hidden />
            <label htmlFor="change-pw-password" style={labelStyle}>
              Password
            </label>
            <input
              id="change-pw-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              style={inputStyle}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <div style={fieldStyle}>
            <Lock style={iconStyle} aria-hidden />
            <label htmlFor="change-pw-confirm" style={labelStyle}>
              Confirm Password
            </label>
            <input
              id="change-pw-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              style={inputStyle}
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: "0.5rem 0.75rem",
                marginBottom: "0.75rem",
                backgroundColor: "#fef2f2",
                color: "#991b1b",
                borderRadius: "6px",
                fontSize: "0.813rem",
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "1rem",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px solid #e5e5e5",
                backgroundColor: "#fff",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                color: "#525252",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
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
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Saving…" : "Save Password"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
