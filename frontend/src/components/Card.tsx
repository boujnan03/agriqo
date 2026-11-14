import type { HTMLAttributes, ReactNode } from "react";

import styles from "./Card.module.css";

/**
 * design.md §6:
 * - standard: white, card radius, soft shadow, optional hairline border
 * - featured: green-tint, card radius, featured padding, NO shadow. Only ONE featured card per
 *   screen: the single "best option" in a ranked list.
 */
export type CardVariant = "standard" | "featured";

export interface CardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "className"
> {
  variant?: CardVariant;
  /** Standard only: adds the optional hairline --border outline (§6). */
  bordered?: boolean;
  children: ReactNode;
  className?: string;
}

export function Card({
  variant = "standard",
  bordered = false,
  children,
  className,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    styles[variant],
    variant === "standard" && bordered ? styles.bordered : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
