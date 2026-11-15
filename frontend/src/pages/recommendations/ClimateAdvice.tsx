import type { LucideIcon } from "lucide-react";
import {
  CloudRain,
  CloudSun,
  Droplet,
  Info,
  Sprout,
  ThermometerSun,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { AdviceCard } from "../../components/AdviceCard";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { RequestStatus } from "../../components/RequestStatus";
import { useSeasonZone } from "../../hooks/useSeasonZone";
import { approxKm, formatSeason } from "../../i18n/format";
import { PATHS } from "../../router/paths";
import { useSession } from "../../state/session";
import {
  isShownAdvice,
  type ShownAdviceId,
  useAdviceText,
} from "../advice/useAdviceText";
import { NoParcel } from "../parcel/NoParcel";
import styles from "./ClimateAdvice.module.css";

const ICONS: Record<ShownAdviceId, LucideIcon> = {
  drought_tolerant: Sprout,
  dry_autumn: CloudSun,
  hot_spring: ThermometerSun,
  dry_spring: Droplet,
  last_season_dry: Droplet,
  wet_frequent: CloudRain,
};

/**
 * Recommendations' "Ce que dit le climat de votre zone" section (design.md §7 template 5; spec
 * §7.6): one Advice card per advice item of the season endpoint, in the API's order, worded
 * in the variant it returned for the farmer's water regime. `field_shift` is not repeated here
 * (Insights shows it). Shares the season request with Farm / Insights (session state).
 *
 * States: no parcel → the no-parcel card; loading / error + retry (§6 Request states);
 * hors_zone → one short card with a way back to Home; proche → a "zone voisine" reminder;
 * no advice → the plain "no marked signal" line.
 */
export function ClimateAdvice() {
  const { t } = useTranslation();
  const { parcel } = useSession();
  const { result, retry } = useSeasonZone();
  const { text, why } = useAdviceText();

  if (!parcel || !result) return <NoParcel />;
  if (result.state !== "success") {
    return <RequestStatus state={result.state} onRetry={retry} />;
  }
  const zone = result.data;
  if (zone.status === "hors_zone") {
    return (
      <Card>
        <div className={styles.outside} data-zone="hors_zone">
          <p className={styles.muted}>
            {t("seasons.outsideText", {
              km: approxKm(zone.nearestCell.distanceDeg),
            })}
          </p>
          <Button to={PATHS.home} variant="outline">
            {t("seasons.outsideAction")}
          </Button>
        </div>
      </Card>
    );
  }

  const advice = zone.advice.filter(isShownAdvice);
  const source = t("advice.source", {
    from: zone.reference.from,
    to: zone.reference.to,
  });
  return (
    <div className={styles.stack}>
      {zone.status === "proche" ? (
        <p className={styles.note} data-zone="proche">
          <span className={styles.icon}>
            <Icon icon={Info} />
          </span>
          {t("seasons.nearbyNote", { km: approxKm(zone.cell.distanceDeg) })}
        </p>
      ) : null}
      <p className={styles.water}>
        <span>{t(`advice.forWater.${zone.query.water}`)}</span>
        <Link to={PATHS.farm} className={styles.link}>
          {t("advice.changeWater")}
        </Link>
      </p>
      {advice.length === 0 ? (
        <p className={styles.muted} data-advice="none">
          {t("advice.none", {
            from: formatSeason(zone.counts.recent.from),
            to: formatSeason(zone.counts.recent.to),
          })}
        </p>
      ) : (
        <ul className={styles.list}>
          {advice.map((a) => (
            <li key={a.id}>
              <AdviceCard
                adviceId={a.id}
                icon={ICONS[a.id]}
                text={text(a)}
                why={why(a)}
                source={source}
                validation={t("advice.validate")}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
