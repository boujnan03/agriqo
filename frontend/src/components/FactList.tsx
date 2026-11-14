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
  icon: LucideIcon;
  tone: FactTone;
}

export interface FactListProps {
  facts: readonly Fact[];
}

/**
 * Icon-labeled fact rows (design.md §5 data-row circles, §2 data-icon colors), used by the
 * Map/Data-entry (§7.2) and Detail (§7.5) templates: icon circle · label · value.
 * Not interactive: these are facts about the field, not things to tap (§2).
 */
export function FactList({ facts }: FactListProps) {
  return (
    <dl className={styles.facts}>
      {facts.map((fact) => (
        <div key={fact.label} className={styles.fact}>
          <span className={`${styles.icon} ${styles[fact.tone]}`}>
            <Icon icon={fact.icon} size="data" />
          </span>
          <dt className={styles.label}>{fact.label}</dt>
          <dd className={styles.value}>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
