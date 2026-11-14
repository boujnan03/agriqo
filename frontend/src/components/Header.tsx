import { ChevronLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";

import styles from "./Header.module.css";
import { Icon } from "./Icon";

export interface HeaderAction {
  icon: LucideIcon;
  /** Required: icon-only buttons need a real accessible name (design.md §5). */
  ariaLabel: string;
  onClick: () => void;
}

interface RootHeaderProps {
  /** Section-root screen (§6/§7): title left-aligned, optional right-side icon button. */
  variant?: "root";
  title: string;
  action?: HeaderAction;
}

interface DrillInHeaderProps {
  /** Drill-in screen (§6/§7): back chevron + title. Pair with NO tab bar. */
  variant: "drill-in";
  title: string;
  /** Where the back arrow goes (a real link, so it also works on a direct page load). */
  backTo: string;
  /** Accessible name of the back link, e.g. "Back to recommendations". */
  backLabel: string;
}

export type HeaderProps = RootHeaderProps | DrillInHeaderProps;

/** design.md §6 Header (height token); the two variants follow the screen templates in §7. */
export function Header(props: HeaderProps) {
  const isDrillIn = props.variant === "drill-in";
  return (
    <header className={styles.header}>
      {isDrillIn ? (
        <Link
          to={props.backTo}
          className={styles.iconButton}
          aria-label={props.backLabel}
        >
          <Icon icon={ChevronLeft} />
        </Link>
      ) : null}
      <h1 className={styles.title}>{props.title}</h1>
      {!isDrillIn && props.action ? (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={props.action.ariaLabel}
          onClick={props.action.onClick}
        >
          <Icon icon={props.action.icon} />
        </button>
      ) : null}
    </header>
  );
}
