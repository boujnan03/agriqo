import styles from "./Badge.module.css";

export interface BadgeProps {
  /** Short status word(s) only, e.g. "Recommended" or "85%" (design.md §6: never more than ~2 words). */
  children: string;
  className?: string;
}

/** design.md §6 Badge/pill: full pill radius, green-tint background, green-900 bold text. */
export function Badge({ children, className }: BadgeProps) {
  return (
    <span className={[styles.badge, className ?? ""].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
