import {
  createElement,
  type ComponentPropsWithoutRef,
  type ElementType,
} from "react";
import styles from "./motion.module.css";

type InteractiveSurfaceProps<T extends ElementType = "div"> = {
  as?: T;
  children: React.ReactNode;
  className?: string | undefined;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function InteractiveSurface<T extends ElementType = "div">({
  as,
  children,
  className,
  ...props
}: InteractiveSurfaceProps<T>): React.JSX.Element {
  const component = as ?? "div";
  const combinedClassName = [styles["interactiveSurface"], className]
    .filter(Boolean)
    .join(" ");

  return createElement(
    component,
    {
      ...props,
      className: combinedClassName,
    },
    children
  );
}
