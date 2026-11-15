import type { LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";

import type { BlockMeta, OkBlock } from "../types/diagnostic";
import { Button } from "./Button";
import { Card } from "./Card";
import styles from "./DataCard.module.css";
import type { FactTone } from "./FactList";
import { Icon } from "./Icon";

export interface DataCardProps<B extends BlockMeta> {
  /** Card heading, e.g. "Sol". */
  title: string;
  /** Heading icon; colored per §2 (soil / water / plant data colors, else neutral). */
  icon: LucideIcon;
  tone: FactTone;
  /** One backend block, as received: its own `status` decides what the card shows. */
  block: B;
  /**
   * The plain-language reason shown for `pas_de_donnees` (the source answered but has nothing
   * at this point), specific to this card: e.g. "no soil data here, check the point is on
   * farmland". Translated by the page, never the backend's French-only message.
   */
  noDataText: string;
  /**
   * The real values, rendered ONLY in the `ok` state. Being a function of the ok block, it
   * simply cannot run when there is no data: a card can never invent a value to fill a gap.
   */
  children: (block: OkBlock<B>) => ReactNode;
  /** Short caveat shown with the values (ok only), e.g. "Estimate (~250 m), not a lab test". */
  caveat?: string;
  /** Heading level inside the page outline (default 2). */
  headingLevel?: 2 | 3;
  /**
   * Optional "Retry" for the `indisponible` state only (never for ok / pas_de_donnees: there
   * is nothing to retry). The page re-sends the same request; this card only shows the button.
   */
  onRetry?: () => void;
  /** State of that retry: in flight, or our backend couldn't be reached for it. */
  retryState?: "retrying" | "failed";
}

/**
 * design.md §6 Data card: a standard card + a source caption ("Données : NASA POWER", §3
 * factual caption size, --text-600) + exactly one of three states, taken straight from the
 * backend block's `status` (never re-derived here):
 * - ok → the real values (children) + the optional caveat
 * - indisponible → "Donnée indisponible" in --text-600 (never a blank or a zero), and, when the
 *   page offers it, a "Retry" outline button (+ a note while the backend is still trying)
 * - pas_de_donnees → the card's specific plain-language reason, not the generic message
 */
export function DataCard<B extends BlockMeta>({
  title,
  icon,
  tone,
  block,
  noDataText,
  children,
  caveat,
  headingLevel = 2,
  onRetry,
  retryState,
}: DataCardProps<B>) {
  const { t } = useTranslation();
  const id = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <Card>
      <section
        className={styles.section}
        aria-labelledby={id}
        data-status={block.status}
        data-error={block.error}
      >
        <Heading id={id} className={styles.title}>
          <span className={`${styles.icon} ${styles[tone]}`}>
            <Icon icon={icon} />
          </span>
          {title}
        </Heading>
        {block.status === "ok" ? (
          <>
            {children(block as OkBlock<B>)}
            {caveat ? <p className={styles.caveat}>{caveat}</p> : null}
          </>
        ) : block.status === "indisponible" ? (
          <>
            <p className={styles.missing}>{t("dataCard.unavailable")}</p>
            {block.retry_pending && retryState !== "failed" ? (
              <p className={styles.caveat}>{t("dataCard.retryPending")}</p>
            ) : null}
            {retryState === "failed" ? (
              <p className={styles.caveat} role="alert">
                {t("dataCard.retryFailed")}
              </p>
            ) : null}
            {onRetry ? (
              <Button
                variant="outline"
                onClick={onRetry}
                disabled={retryState === "retrying"}
                aria-busy={retryState === "retrying"}
              >
                {retryState === "retrying"
                  ? t("dataCard.retrying")
                  : t("request.retry")}
              </Button>
            ) : null}
          </>
        ) : (
          <p className={styles.missing}>{noDataText}</p>
        )}
        <p className={styles.source}>
          {t("dataCard.source", { source: block.source })}
        </p>
      </section>
    </Card>
  );
}
