import {
  createElement,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
} from "react";
import styles from "./motion.module.css";

type RevealProps<T extends ElementType = "div"> = {
  as?: T;
  children: React.ReactNode;
  className?: string | undefined;
  delayMs?: number;
  distance?: number;
  style?: CSSProperties | undefined;
  variant?: "blur" | "fade" | "scale";
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className" | "style"
>;

export function Reveal<T extends ElementType = "div">({
  as,
  children,
  className,
  delayMs = 0,
  distance = 8,
  style,
  variant = "fade",
  ...props
}: RevealProps<T>): React.JSX.Element {
  const component = as ?? "div";
  const variantClassName =
    variant === "blur"
      ? styles["revealBlur"]
      : variant === "scale"
        ? styles["revealScale"]
        : styles["revealFade"];
  const combinedClassName = [styles["reveal"], variantClassName, className]
    .filter(Boolean)
    .join(" ");
  const mergedStyle = {
    ...style,
    ["--motion-delay" as string]: `${delayMs}ms`,
    ["--motion-distance" as string]: `${distance}px`,
  };

  return createElement(
    component,
    {
      ...props,
      className: combinedClassName,
      style: mergedStyle,
    },
    children
  );
}
