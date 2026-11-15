import { Droplets, MapPinned } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { SegmentedControl } from "../../components/SegmentedControl";
import { useSeasonZone } from "../../hooks/useSeasonZone";
import { approxKm, formatCoordinate } from "../../i18n/format";
import { useSession } from "../../state/session";
import { WATER_REGIMES } from "../../types/seasons";
import styles from "./WaterZoneCard.module.css";

/**
 * Farm's "water and climate zone" card (design.md §7 template 3): the farmer's own water
 * regime (rain-fed / irrigated, a §6 Segmented control) — farmer-entered, labelled as NOT NASA
 * data, remembered on this device — and the NASA POWER cell the season data comes from: its
 * centre and its approximate distance ("~N km", degrees × 111), plus "nearby area" when the
 * parcel is just outside the covered cells. Changing the regime re-asks the season endpoint.
 */
export function WaterZoneCard() {
  const { t } = useTranslation();
  const { water, setWater } = useSession();
  const { result } = useSeasonZone();

  const zone = () => {
    if (!result || result.state === "loading") {
      return <span className={styles.muted}>{t("farm.zoneLoading")}</span>;
    }
    if (result.state === "error") {
      return <span className={styles.muted}>{t("farm.zoneError")}</span>;
    }
    const z = result.data;
    if (z.status === "hors_zone") {
      return (
        <span className={styles.muted} data-zone="hors_zone">
          {t("farm.zoneOutside")}
        </span>
      );
    }
    return (
      <span className={styles.zone} data-zone={z.status}>
        <span>{t("farm.zoneLabel")}</span>
        <span>
          {t("parcel.lat")} <bdi dir="ltr">{formatCoordinate(z.cell.lat)}</bdi>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {t("parcel.lon")} <bdi dir="ltr">{formatCoordinate(z.cell.lon)}</bdi>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {t("farm.zoneDistance", { km: approxKm(z.cell.distanceDeg) })}
        </span>
        {z.status === "proche" ? <Badge>{t("seasons.nearby")}</Badge> : null}
      </span>
    );
  };

  return (
    <Card>
      <section className={styles.section} aria-labelledby="farm-water">
        <h2 id="farm-water" className={styles.title}>
          <span className={styles.icon}>
            <Icon icon={Droplets} />
          </span>
          {t("farm.waterTitle")}
        </h2>
        <SegmentedControl
          ariaLabel={t("farm.waterLabel")}
          options={WATER_REGIMES.map((w) => ({
            value: w,
            label: t(`farm.water.${w}`),
          }))}
          value={water}
          onChange={setWater}
        />
        <p className={styles.note}>{t("farm.waterNote")}</p>
        {/* Polite live region: the zone line updates after the request, without a role="status"
            of its own (the page's request state card is the one status). */}
        <p className={styles.line} aria-live="polite">
          <span className={styles.icon}>
            <Icon icon={MapPinned} />
          </span>
          {zone()}
        </p>
      </section>
    </Card>
  );
}
