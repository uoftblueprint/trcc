import {
  createElement,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
} from "react";
import styles from "./motion.module.css";

type StaggerProps<T extends ElementType = "div"> = {
  as?: T;
  children: React.ReactNode;
  className?: string | undefined;
  delayMs?: number;
  stepMs?: number;
  style?: CSSProperties | undefined;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className" | "style"
>;

export function Stagger<T extends ElementType = "div">({
  as,
  children,
  className,
  delayMs = 0,
  stepMs = 36,
  style,
  ...props
}: StaggerProps<T>): React.JSX.Element {
  const component = as ?? "div";
  const combinedClassName = [styles["stagger"], className]
    .filter(Boolean)
    .join(" ");
  const mergedStyle = {
    ...style,
    ["--motion-delay" as string]: `${delayMs}ms`,
    ["--stagger-step" as string]: `${stepMs}ms`,
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
