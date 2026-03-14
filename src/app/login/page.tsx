"use client";

import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/lib/client/supabase/auth";

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
    <main>
      <h1>Log in</h1>

      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend>Log in</legend>

          <div>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <nav>
            <a href="/forgot-password">Forgot password?</a>
          </nav>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </fieldset>
      </form>

      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}
