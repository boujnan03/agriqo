import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";

import styles from "./AdviceCard.module.css";
import { Card } from "./Card";
import { Icon } from "./Icon";

export interface AdviceCardProps {
  /** Stable advice id (e.g. "dry_autumn"), exposed as data-advice for styling/tests. */
  adviceId: string;
  icon: LucideIcon;
  /** The advice itself, in the variant for the farmer's water regime. */
  text: string;
  /** "Pourquoi : …", built ONLY from the advice's evidence numbers. */
  why: string;
  /** "Source : NASA POWER, normale 1996–2025 de votre zone." */
  source: string;
  /** "À valider par un agronome": every advice carries it (thresholds pending review). */
  validation: string;
}

/**
 * design.md §6 Advice card: a STANDARD card (never featured — the featured card stays the
 * ranking's single best option): an icon, the advice in plain words, a "why" line made only
 * of numbers from the backend's evidence, the source, and "to be validated by an agronomist"
 * with an icon, so the caveat is never conveyed by color alone (§9).
 */
export function AdviceCard({
  adviceId,
  icon,
  text,
  why,
  source,
  validation,
}: AdviceCardProps) {
  return (
    <Card>
      <article className={styles.advice} data-advice={adviceId}>
        <div className={styles.head}>
          <span className={styles.icon}>
            <Icon icon={icon} size="data" />
          </span>
          <p className={styles.text}>{text}</p>
        </div>
        <p className={styles.why}>{why}</p>
        <p className={styles.meta}>
          <span>{source}</span>
          <span className={styles.validation}>
            <Icon icon={ShieldCheck} />
            {validation}
          </span>
        </p>
      </article>
    </Card>
  );
}
