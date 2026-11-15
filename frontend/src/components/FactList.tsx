import type { LucideIcon } from "lucide-react";

import styles from "./FactList.module.css";
import { Icon } from "./Icon";

/**
 * Icon color of a fact row. design.md §2: the three --icon-* colors are ONLY for soil / water /
 * crop facts; any other fact (a season, a date…) uses "neutral" = the §2 secondary accent
 * --green-700, the same treatment as general data on the dashboard.
 */
export type FactTone = "soil" | "water" | "plant" | "neutral";

export interface Fact {
  label: string;
  value: string;
  /** Row icon in its circle. Omit inside a card whose heading already carries the icon. */
  icon?: LucideIcon;
  /** Icon color; defaults to "neutral". */
  tone?: FactTone;
}

export interface FactListProps {
  facts: readonly Fact[];
}

/**
 * Icon-labeled fact rows (design.md §5 data-row circles, §2 data-icon colors), used by the
 * Home (§7.2), Detail (§7.6) and, without icons, the Data cards (§6): icon circle · label · value.
 * Not interactive: these are facts about the field, not things to tap (§2).
 */
export function FactList({ facts }: FactListProps) {
  return (
    <dl className={styles.facts}>
      {facts.map((fact) => (
        <div key={fact.label} className={styles.fact}>
          {fact.icon ? (
            <span
              className={`${styles.icon} ${styles[fact.tone ?? "neutral"]}`}
            >
              <Icon icon={fact.icon} size="data" />
            </span>
          ) : null}
          <dt className={styles.label}>{fact.label}</dt>
          <dd className={styles.value}>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
