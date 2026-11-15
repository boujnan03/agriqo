import { MapPin, Shapes } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Icon } from "../../components/Icon";
import { formatCoordinate } from "../../i18n/format";
import { useFormat } from "../../i18n/useFormat";
import { type Parcel, polygonAreaM2 } from "../../state/parcelGeometry";
import styles from "./ParcelCoords.module.css";

/**
 * The drawn parcel, shown on every page that has data about it (Home, Farm, Insights,
 * Weather): its centroid (the point the point-based sources are asked about) and its size
 * (approximate area + number of corners). Each coordinate is isolated left-to-right so its
 * minus sign stays in front of it inside Arabic text (§9a).
 */
export function ParcelCoords({ parcel }: { parcel: Parcel }) {
  const { t } = useTranslation();
  const { num } = useFormat();
  const hectares = polygonAreaM2(parcel.polygon) / 10_000;
  return (
    <div className={styles.parcel}>
      <p className={styles.line}>
        <Icon icon={MapPin} />
        <span>{t("parcel.centre")}</span>
        <span>
          {t("parcel.lat")} <bdi dir="ltr">{formatCoordinate(parcel.lat)}</bdi>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {t("parcel.lon")} <bdi dir="ltr">{formatCoordinate(parcel.lon)}</bdi>
        </span>
      </p>
      <p className={styles.line}>
        <Icon icon={Shapes} />
        <span>
          {t("parcel.shape", {
            area: num(hectares, hectares < 10 ? 2 : 1),
            count: parcel.polygon.length,
          })}
        </span>
      </p>
    </div>
  );
}
