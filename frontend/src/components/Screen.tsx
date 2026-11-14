import type { ReactNode } from "react";

import styles from "./Screen.module.css";

export interface ScreenProps {
  /** A <Header>, or nothing (Cover template, design.md §7.1). */
  header?: ReactNode;
  /** A <TabBar> on section-root screens; nothing on Cover and drill-in screens (§7). */
  tabBar?: ReactNode;
  children: ReactNode;
}

/**
 * Page frame shared by every screen: header slot, scrollable content with the §4 screen edge
 * padding, and the fixed tab bar (content is padded so it never hides behind the bar).
 */
export function Screen({ header, tabBar, children }: ScreenProps) {
  return (
    <div className={styles.screen}>
      {header}
      <main
        className={[styles.content, tabBar ? styles.withTabBar : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </main>
      {tabBar}
    </div>
  );
}
