import Link from "next/link";
import styles from "@/styles/login.module.css";

export default function AuthCodeErrorPage(): React.JSX.Element {
  return (
    <main className={styles["container"]}>
      <div className={styles["content"]}>
        <h1 className={styles["title"]}>Link expired or invalid</h1>

        <p role="alert" className={styles["error"]}>
          The password reset link is invalid or has expired. Please request a
          new one.
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
