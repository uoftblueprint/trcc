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
  className?: string;
  delayMs?: number;
  style?: CSSProperties;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className" | "style"
>;

export function Reveal<T extends ElementType = "div">({
  as,
  children,
  className,
  delayMs = 0,
  style,
  ...props
}: RevealProps<T>): React.JSX.Element {
  const component = as ?? "div";
  const combinedClassName = [styles["reveal"], className]
    .filter(Boolean)
    .join(" ");
  const mergedStyle = {
    ...style,
    ["--motion-delay" as string]: `${delayMs}ms`,
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
