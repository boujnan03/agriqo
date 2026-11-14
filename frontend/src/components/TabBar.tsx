import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router";

import { Icon } from "./Icon";
import styles from "./TabBar.module.css";

export interface TabItem {
  /** Stable key, e.g. "home". */
  id: string;
  label: string;
  icon: LucideIcon;
  /**
   * Route to open. Omit for a destination that has no screen yet: the tab is then shown but
   * rendered as a disabled <button> (not navigable).
   */
  to?: string;
}

export interface TabBarProps {
  items: readonly TabItem[];
  /** Accessible name of the <nav> landmark. */
  ariaLabel: string;
}

/**
 * design.md §6 Bottom tab bar: fixed, white, hairline top border, icon + label stacked.
 * Active (= current route, via NavLink) → --green-900 + bold label; inactive → --tab-inactive.
 * Only on section-root screens (§7); drill-in screens use the Header back arrow instead.
 */
export function TabBar({ items, ariaLabel }: TabBarProps) {
  return (
    <nav className={styles.bar} aria-label={ariaLabel}>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            {item.to !== undefined ? (
              <NavLink
                to={item.to}
                end
                className={({ isActive }) =>
                  [styles.tab, isActive ? styles.active : ""]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                <Icon icon={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ) : (
              <button type="button" className={styles.tab} disabled>
                <Icon icon={item.icon} />
                <span>{item.label}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
