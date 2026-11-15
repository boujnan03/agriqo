import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Icon } from "../../components/Icon";
import { formatCoordinate } from "../../i18n/format";
import type { ParcelLocation } from "../../state/session";
import styles from "./ParcelCoords.module.css";

/**
 * The picked parcel's real coordinates, shown on every page that has data about it (Home,
 * Farm, Insights, Weather). Each number is isolated left-to-right so its minus sign stays in
 * front of it inside Arabic text (§9a).
 */
export function ParcelCoords({ parcel }: { parcel: ParcelLocation }) {
  const { t } = useTranslation();
  return (
    <p className={styles.coords}>
      <Icon icon={MapPin} />
      <span>
        {t("parcel.lat")} <bdi dir="ltr">{formatCoordinate(parcel.lat)}</bdi>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        {t("parcel.lon")} <bdi dir="ltr">{formatCoordinate(parcel.lon)}</bdi>
      </span>
    </p>
  );
}
