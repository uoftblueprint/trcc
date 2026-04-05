"use client";

import { useLayoutEffect, useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setPasswordResetGateCookieInBrowser } from "@/lib/auth/passwordResetGateBrowser";
import { exchangePkceRecoveryCode } from "@/lib/client/supabase/pkceRecoveryExchange";
import styles from "@/styles/login.module.css";

export default function AuthCodeErrorPage(): ReactElement {
  const router = useRouter();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [exchangeMessage, setExchangeMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    void (async (): Promise<void> => {
      const result = await exchangePkceRecoveryCode(code);
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setExchangeMessage(result.message);
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

  if (bootstrapping) {
    return (
      <main className={styles["container"]}>
        <div className={styles["content"]}>
          <h1 className={styles["title"]}>Reset Password</h1>
          <p className={styles["forgotPasswordBlurb"]} role="status">
            Verifying reset link…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles["container"]}>
      <div className={styles["content"]}>
        <h1 className={styles["title"]}>Link expired or invalid</h1>

        <p role="alert" className={styles["error"]}>
          {exchangeMessage ??
            "The password reset link is invalid or has expired. Please request a new one."}
        </p>

        <div className={styles["forgotPasswordContainer"]}>
          <Link href="/forgot-password" className={styles["forgotPassword"]}>
            Request a new reset link
          </Link>
        </div>
      </div>
    </main>
  );
}
