// temp ugly auth page for testing
"use client";

import { useState } from "react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { AnimatedInput } from "@/components/ui/AnimatedInput";
import { Reveal } from "@/components/ui/Reveal";
import { signInWithEmail, signUpWithEmail } from "@/lib/client/supabase/auth";

export default function LoginPage(): React.JSX.Element {
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
      <Reveal as="h1">Sign In</Reveal>
      <Reveal as="form" onSubmit={handleSignIn} delayMs={40}>
        <label htmlFor="signin-email">Email</label>
        <AnimatedInput
          id="signin-email"
          type="email"
          value={signInEmail}
          onChange={(event) => setSignInEmail(event.target.value)}
          required
        />

        <label htmlFor="signin-password">Password</label>
        <AnimatedInput
          id="signin-password"
          type="password"
          value={signInPassword}
          onChange={(event) => setSignInPassword(event.target.value)}
          required
        />

        <AnimatedButton type="submit" disabled={loading}>
          Sign In
        </AnimatedButton>
      </Reveal>

      <Reveal as="h1" delayMs={80}>
        Sign Up
      </Reveal>
      <Reveal as="form" onSubmit={handleSignUp} delayMs={120}>
        <label htmlFor="signup-email">Email</label>
        <AnimatedInput
          id="signup-email"
          type="email"
          value={signUpEmail}
          onChange={(event) => setSignUpEmail(event.target.value)}
          required
        />

        <label htmlFor="signup-password">Password</label>
        <AnimatedInput
          id="signup-password"
          type="password"
          value={signUpPassword}
          onChange={(event) => setSignUpPassword(event.target.value)}
          required
        />

        <AnimatedButton type="submit" disabled={loading}>
          Sign Up
        </AnimatedButton>
      </Reveal>

      {message ? (
        <Reveal as="p" delayMs={160}>
          {message}
        </Reveal>
      ) : null}
      {responseData ? (
        <Reveal as="pre" delayMs={200}>
          {JSON.stringify(responseData, null, 2)}
        </Reveal>
      ) : null}
    </main>
  );
}
