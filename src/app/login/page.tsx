// temp ugly auth page for testing
"use client";

import { useState } from "react";
import { signInWithEmail, signUpWithEmail } from "@/lib/client/supabase/auth";

export default function LoginPage(): JSX.Element {
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setResponseData(null);
    const { data, error } = await signInWithEmail(signInEmail, signInPassword);
    setMessage(error ? error.message : "Signed in successfully.");
    setResponseData(data);
    setLoading(false);
  };

  const handleSignUp = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setResponseData(null);
    const { data, error } = await signUpWithEmail(signUpEmail, signUpPassword);
    setMessage(
      error ? error.message : "Check your email to confirm your account."
    );
    setResponseData(data);
    setLoading(false);
  };

  return (
    <main>
      <h1>Sign In</h1>
      <form onSubmit={handleSignIn}>
        <label htmlFor="signin-email">Email</label>
        <input
          id="signin-email"
          type="email"
          value={signInEmail}
          onChange={(event) => setSignInEmail(event.target.value)}
          required
        />

        <label htmlFor="signin-password">Password</label>
        <input
          id="signin-password"
          type="password"
          value={signInPassword}
          onChange={(event) => setSignInPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          Sign In
        </button>
      </form>

      <h1>Sign Up</h1>
      <form onSubmit={handleSignUp}>
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          value={signUpEmail}
          onChange={(event) => setSignUpEmail(event.target.value)}
          required
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          value={signUpPassword}
          onChange={(event) => setSignUpPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          Sign Up
        </button>
      </form>

      {message ? <p>{message}</p> : null}
      {responseData ? <pre>{JSON.stringify(responseData, null, 2)}</pre> : null}
    </main>
  );
}
