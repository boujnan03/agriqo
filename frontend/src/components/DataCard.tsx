import type { LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

import type { SourcedData } from "../types/diagnostic";
import { Card } from "./Card";
import styles from "./DataCard.module.css";
import type { FactTone } from "./FactList";
import { Icon } from "./Icon";

export interface DataCardProps<T> {
  /** Card heading, e.g. "Sol". */
  title: string;
  /** Heading icon; colored per §2 (soil / water / plant data colors, else neutral). */
  icon: LucideIcon;
  tone: FactTone;
  /** One source's answer: its status decides what the card shows. */
  result: SourcedData<T>;
  /**
   * The real values, rendered ONLY in the `ok` state. Being a function of the data, it simply
   * cannot run when there is no data: a card can never invent a value to fill a gap.
   */
  children: (data: T) => ReactNode;
  /** Heading level inside the page outline (default 2). */
  headingLevel?: 2 | 3;
}

/**
 * design.md §6 Data card: a standard card + a source caption ("Données : NASA POWER", §3
 * factual caption size, --text-600) + exactly one of three states:
 * - ok → the real values (children)
 * - indisponible → "Donnée indisponible" in --text-600 (never a blank or a zero)
 * - pas_de_donnees → the specific plain-language reason, not the generic message
 */
export function DataCard<T>({
  title,
  icon,
  tone,
  result,
  children,
  headingLevel = 2,
}: DataCardProps<T>) {
  const { t } = useTranslation();
  const id = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <Card>
      <section
        className={styles.section}
        aria-labelledby={id}
        data-status={result.status}
      >
        <Heading id={id} className={styles.title}>
          <span className={`${styles.icon} ${styles[tone]}`}>
            <Icon icon={icon} />
          </span>
          {title}
        </Heading>
        {result.status === "ok" ? (
          children(result.data)
        ) : (
          <p className={styles.missing}>
            {result.status === "indisponible"
              ? t("dataCard.unavailable")
              : t(`dataCard.noData.${result.reason}`)}
          </p>
        )}
        <p className={styles.source}>
          {t("dataCard.source", { source: result.source })}
        </p>
      </section>
    </Card>
  );
}
