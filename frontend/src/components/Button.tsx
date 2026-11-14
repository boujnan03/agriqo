import { ArrowRight } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

import styles from "./Button.module.css";
import { Icon } from "./Icon";

/**
 * design.md §6:
 * - primary: green-900 fill, white text, optional trailing arrow, full-width by default
 * - secondary: plain centered text link, text-600 (or white when `onPhoto`)
 * - outline: white fill, green-900 outline border, green-900 text (non-committal action)
 */
export type ButtonVariant = "primary" | "secondary" | "outline";

interface CommonProps {
  variant?: ButtonVariant;
  children: ReactNode;
  /** Primary only: trailing arrow icon (§6 "optional trailing arrow icon"). */
  withArrow?: boolean;
  /** Full width (§6 default) unless two buttons share a row. Ignored for `secondary`. */
  fullWidth?: boolean;
  /** Secondary only: white text when the link sits on a photo (§6). */
  onPhoto?: boolean;
  className?: string;
}

/** Renders a real <button> (design.md §9). */
type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    to?: undefined;
  };
/** With `to`, renders a real router link (<a href>) instead (design.md §9). */
type AsLink = CommonProps & { to: string };

export type ButtonProps = AsButton | AsLink;

export function Button({
  variant = "primary",
  children,
  withArrow = false,
  fullWidth = true,
  onPhoto = false,
  className,
  to,
  ...buttonAttributes
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    variant !== "secondary" && fullWidth ? styles.fullWidth : "",
    variant === "secondary" && onPhoto ? styles.onPhoto : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span>{children}</span>
      {variant === "primary" && withArrow ? <Icon icon={ArrowRight} /> : null}
    </>
  );

  if (to !== undefined) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...buttonAttributes}>
      {content}
    </button>
  );
}
