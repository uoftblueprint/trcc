import type { ButtonHTMLAttributes } from "react";
import styles from "./motion.module.css";

type AnimatedButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function AnimatedButton({
  children,
  className,
  ...props
}: AnimatedButtonProps): React.JSX.Element {
  const combinedClassName = [styles["interactiveButton"], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={combinedClassName} {...props}>
      <span className={styles["interactiveButtonLabel"]}>{children}</span>
    </button>
  );
}
