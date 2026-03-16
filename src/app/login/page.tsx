"use client";

import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/lib/client/supabase/auth";
import styles from "@/styles/login.module.css";

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await signInWithEmail(email, password);

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles["container"]}>
      <div className={styles["content"]}>
        <h1 className={styles["title"]}>Log in</h1>

        <form onSubmit={handleSubmit} className={styles["formCard"]}>
          <div className={styles["inputGroup"]}>
            <label htmlFor="login-email" className={styles["label"]}>
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email"
              className={styles["input"]}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className={styles["inputGroup"]}>
            <label htmlFor="login-password" className={styles["label"]}>
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className={styles["input"]}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className={styles["forgotPasswordContainer"]}>
            <a href="/forgot-password" className={styles["forgotPassword"]}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles["submitButton"]}
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        {error ? (
          <p role="alert" className={styles["error"]}>
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
