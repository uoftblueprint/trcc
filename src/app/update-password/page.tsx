"use client";

import { useEffect, useState, type ReactElement } from "react";
import { createClient } from "@/lib/client/supabase/client";
import styles from "@/styles/login.module.css";

export default function Page(): ReactElement {
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect((): (() => void) => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const update = async (): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) setMsg(error.message);
    else setMsg("Password updated.");
  };

  if (!ready) {
    return (
      <main className={styles["container"]}>
        <div className={styles["content"]}>
          <h1 className={styles["title"]}>Update Password</h1>
          <div className={styles["formCard"]}>
            <p
              style={{ textAlign: "center", color: "var(--color-neutral-600)" }}
            >
              Waiting for recovery session...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles["container"]}>
      <div className={styles["content"]}>
        <h1 className={styles["title"]}>Set new password</h1>

        <div className={styles["formCard"]}>
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
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={update}
            className={styles["submitButton"]}
          >
            Update Password
          </button>
        </div>

        {msg ? (
          <p
            role="alert"
            className={styles["error"]}
            style={
              msg === "Password updated."
                ? { color: "var(--color-teal-700)" }
                : undefined
            }
          >
            {msg}
          </p>
        ) : null}
      </div>
    </main>
  );
}
