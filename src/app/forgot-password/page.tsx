"use client";

import { Suspense, useState, type ReactElement } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "@/styles/login.module.css";

type AlertState = { type: "success" | "error"; message: string } | null;

function ForgotPasswordContent(): ReactElement {
  const searchParams = useSearchParams();
  const fromEmailOnly = searchParams.get("reset") === "use-email-link";

  const [email, setEmail] = useState("");
  const [alert, setAlert] = useState<AlertState>(null);
  const [sending, setSending] = useState(false);

  const requestReset = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setSending(true);
    setAlert(null);

    try {
      const response = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to send reset email.");
      }

      setAlert({
        type: "success",
        message:
          payload?.message ??
          "Password reset email sent. Check your inbox for the link.",
      });
    } catch (error) {
      setAlert({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to send reset email.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className={styles["container"]}>
      <div className={styles["content"]}>
        <h1 className={styles["title"]}>Forgot password?</h1>

        <p className={styles["forgotPasswordBlurb"]}>
          {fromEmailOnly ? (
            <>
              Password reset is only available using the link in the email we
              send you. Request a new link below if yours expired or was lost.
              <br />
              <br />
            </>
          ) : null}
          <b>If you are a Staff Member, please contact the Administrator.</b>
          <br />
          <br />
          If you are an Administrator, please enter the email you used to
          register your account, we will send an email to reset your password.
        </p>

        <form onSubmit={requestReset} className={styles["formCard"]}>
          <div className={styles["inputGroup"]}>
            <label htmlFor="forgot-password-email" className={styles["label"]}>
              Email
            </label>
            <input
              id="forgot-password-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              className={styles["input"]}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className={styles["submitButton"]}
          >
            {sending ? "Sending link…" : "Send"}
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

export default function Page(): ReactElement {
  return (
    <Suspense
      fallback={
        <main className={styles["container"]}>
          <div className={styles["content"]}>
            <h1 className={styles["title"]}>Forgot password?</h1>
            <p className={styles["forgotPasswordBlurb"]} role="status">
              Loading…
            </p>
          </div>
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
