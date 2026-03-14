import type { InputHTMLAttributes } from "react";
import styles from "./motion.module.css";

type AnimatedInputProps = InputHTMLAttributes<HTMLInputElement>;

export function AnimatedInput({
  className,
  ...props
}: AnimatedInputProps): React.JSX.Element {
  const combinedClassName = [styles["interactiveInput"], className]
    .filter(Boolean)
    .join(" ");

  return <input className={combinedClassName} {...props} />;
}
