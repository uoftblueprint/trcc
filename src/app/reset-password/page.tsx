"use client";

import { useLayoutEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearPasswordResetGateCookieInBrowser,
  setPasswordResetGateCookieInBrowser,
} from "@/lib/auth/passwordResetGateBrowser";
import { createClient } from "@/lib/client/supabase/client";
import { exchangePkceRecoveryCode } from "@/lib/client/supabase/pkceRecoveryExchange";
import styles from "@/styles/login.module.css";

type AlertState = { type: "success" | "error"; message: string } | null;

export default function Page(): ReactElement {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [alert, setAlert] = useState<AlertState>(null);
  const [updating, setUpdating] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootMessage, setBootMessage] = useState("Loading…");

  useLayoutEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      setBootstrapping(false);
      return;
    }

    setBootMessage("Verifying reset link…");

    let cancelled = false;
    void (async (): Promise<void> => {
      const result = await exchangePkceRecoveryCode(code);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setAlert({
          type: "error",
          message: result.message,
        });
        setBootstrapping(false);
        return;
      }

      setPasswordResetGateCookieInBrowser();
      void router.replace("/reset-password");
      setBootstrapping(false);
    })();

    return (): void => {
      cancelled = true;
    };
  }, [router]);

  const updatePassword = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!password.trim()) {
      setAlert({ type: "error", message: "Please enter a new password." });
      return;
    }

    if (password.length < 6) {
      setAlert({
        type: "error",
        message: "Password must be at least 6 characters",
      });
      return;
    }

    if (password !== confirmPassword) {
      setAlert({ type: "error", message: "Passwords do not match." });
      return;
    }

    setUpdating(true);
    setAlert(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      clearPasswordResetGateCookieInBrowser();

      setAlert({
        type: "success",
        message: "Password updated. Redirecting to login…",
      });

      setTimeout(() => router.push("/login"), 2000);
    } catch (error) {
      setAlert({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to update password.",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (bootstrapping) {
    return (
      <main className={styles["container"]}>
        <div className={styles["content"]}>
          <h1 className={styles["title"]}>Reset Password</h1>
          <p className={styles["forgotPasswordBlurb"]} role="status">
            {bootMessage}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles["container"]}>
      <div className={styles["content"]}>
        <h1 className={styles["title"]}>Reset Password</h1>

        <form onSubmit={updatePassword} className={styles["formCard"]}>
          <div className={styles["inputGroup"]}>
            <label htmlFor="new-password" className={styles["label"]}>
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              placeholder="Enter your new password"
              className={styles["input"]}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className={styles["inputGroup"]}>
            <label htmlFor="confirm-password" className={styles["label"]}>
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm your new password"
              className={styles["input"]}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className={styles["submitButton"]}
          >
            {updating ? "Updating…" : "Update password"}
          </button>
        </form>

        <div className={styles["forgotPasswordContainer"]}>
          <Link href="/login" className={styles["forgotPassword"]}>
            Back to login
          </Link>
        </div>

        {alert ? (
          <p
            role="alert"
            className={styles["error"]}
            style={
              alert.type === "success"
                ? { color: "var(--color-teal-700)" }
                : undefined
            }
          >
            {alert.message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
