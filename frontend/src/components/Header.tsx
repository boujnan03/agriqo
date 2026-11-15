import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";

import { useDirection } from "../i18n/useDirection";
import { logo } from "../assets/images";
import styles from "./Header.module.css";
import { Icon } from "./Icon";
import { LanguageSwitcher } from "./LanguageSwitcher";

export interface HeaderAction {
  icon: LucideIcon;
  /** Required: icon-only buttons need a real accessible name (design.md §5). */
  ariaLabel: string;
  onClick: () => void;
}

interface RootHeaderProps {
  /** Section-root screen (§6/§7): title at the start, optional icon button at the end. */
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

/**
 * design.md §6 Header (height token); the two variants follow the screen templates in §7.
 * Both carry the §9a language switcher at the end. The back chevron points toward the start of
 * the reading direction: left in French/English, right in Arabic (§9a).
 * Section-root headers start with the AGRIQO mark (§1 logo); on drill-in screens that start slot
 * belongs to the back chevron. The mark is decorative (alt=""): the title names the screen.
 */
export function Header(props: HeaderProps) {
  const isDrillIn = props.variant === "drill-in";
  const BackChevron = useDirection() === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <header className={styles.header}>
      {isDrillIn ? (
        <Link
          to={props.backTo}
          className={styles.iconButton}
          aria-label={props.backLabel}
        >
          <Icon icon={BackChevron} />
        </Link>
      ) : (
        <img className={styles.logo} src={logo.mark} alt="" />
      )}
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
      <LanguageSwitcher />
    </header>
  );
}
