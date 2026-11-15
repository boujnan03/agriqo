import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { PATHS } from "../../router/paths";
import styles from "./NoParcel.module.css";

/**
 * Short empty state for screens that show data about the picked parcel (Farm §7.3, Weather
 * §7.8) when the farmer got there before picking one on Home: one line + a way back to Home,
 * instead of empty or broken data cards.
 */
export function NoParcel() {
  const { t } = useTranslation();
  return (
    <Card>
      <section className={styles.empty} aria-labelledby="no-parcel">
        <span className={styles.icon}>
          <Icon icon={MapPin} size="data" />
        </span>
        <h2 id="no-parcel" className={styles.title}>
          {t("parcel.noneTitle")}
        </h2>
        <p className={styles.text}>{t("parcel.noneText")}</p>
        <Button to={PATHS.home} withArrow>
          {t("parcel.choose")}
        </Button>
      </section>
    </Card>
  );
}
