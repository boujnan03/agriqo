import { LoaderCircle, ServerCrash } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "./Button";
import { Card } from "./Card";
import { Icon } from "./Icon";
import styles from "./RequestStatus.module.css";

export interface RequestStatusProps {
  /** loading: our request is in flight. error: our own backend failed to answer at all. */
  state: "loading" | "error";
  /** Error only: re-send the request. */
  onRetry?: () => void;
}

/**
 * design.md §6 Request states: the page-level state of a request to OUR backend, deliberately
 * distinct from a Data card's `indisponible` (which means the backend answered and one of ITS
 * sources failed). One card for the whole page, instead of a sea of "unavailable" cards that
 * would wrongly blame each data source:
 * - loading → a short "loading your plot's data" line, announced politely (role="status")
 * - error → our server can't be reached, nothing is shown in its place, one retry button
 *   (role="alert")
 */
export function RequestStatus({ state, onRetry }: RequestStatusProps) {
  const { t } = useTranslation();
  const id = useId();

  if (state === "loading") {
    return (
      <Card>
        <p className={styles.loading} role="status">
          <span className={styles.spinner}>
            <Icon icon={LoaderCircle} />
          </span>
          {t("request.loading")}
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <section
        className={styles.error}
        role="alert"
        aria-labelledby={id}
        data-request="error"
      >
        <span className={styles.errorIcon}>
          <Icon icon={ServerCrash} size="data" />
        </span>
        <h2 id={id} className={styles.title}>
          {t("request.errorTitle")}
        </h2>
        <p className={styles.text}>{t("request.errorText")}</p>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            {t("request.retry")}
          </Button>
        ) : null}
      </section>
    </Card>
  );
}
