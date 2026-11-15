import type { LucideIcon } from "lucide-react";
import {
  ChartColumn,
  CloudSun,
  Droplets,
  History,
  Info,
  MapPinOff,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { FactList } from "../../components/FactList";
import { Icon } from "../../components/Icon";
import { ProgressBar } from "../../components/ProgressBar";
import { RequestStatus } from "../../components/RequestStatus";
import { approxKm, formatSeason } from "../../i18n/format";
import { useFormat } from "../../i18n/useFormat";
import { PATHS } from "../../router/paths";
import type { Remote } from "../../state/session";
import type {
  SeasonEntry,
  SeasonTypeId,
  ZoneCovered,
  ZoneResponse,
} from "../../types/seasons";
import styles from "./SeasonSection.module.css";
import { SeasonRainChart } from "./SeasonRainChart";

export interface SeasonSectionProps {
  /** The season-zone request for the picked parcel (hooks/useSeasonZone). */
  result: Remote<ZoneResponse>;
  retry: () => void;
}

/** A standard card holding one titled section (same shape as the page's other cards). */
function SeasonCard({
  id,
  title,
  icon,
  source,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  source?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <section className={styles.section} aria-labelledby={id}>
        <h2 id={id} className={styles.title}>
          <span className={styles.icon}>
            <Icon icon={icon} />
          </span>
          {title}
        </h2>
        {children}
        {source ? <p className={styles.source}>{source}</p> : null}
      </section>
    </Card>
  );
}

/**
 * Insights' season-type section (design.md §7 template 4; spec §7.5): the latest available
 * season of the parcel's NASA POWER cell, its rain over the last 10 seasons against the
 * normal, the list of those seasons, the "Field Shift" message when the backend's
 * `field_shift` rule fired, and root-zone moisture. Every number comes from the response.
 *
 * Its own request, so its own states (design.md §6 Request states): loading, error + retry,
 * and `hors_zone` (a normal answer: the parcel is outside the covered cells → a card with a
 * way back to Home). `proche` shows the data with a "nearby area" note.
 */
export function SeasonSection({ result, retry }: SeasonSectionProps) {
  const { t } = useTranslation();

  if (result.state !== "success") {
    return <RequestStatus state={result.state} onRetry={retry} />;
  }
  const zone = result.data;
  if (zone.status === "hors_zone") {
    return (
      <Card>
        <section
          className={styles.outside}
          aria-labelledby="season-outside"
          data-zone="hors_zone"
        >
          <span className={styles.outsideIcon}>
            <Icon icon={MapPinOff} size="data" />
          </span>
          <h2 id="season-outside" className={styles.title}>
            {t("seasons.outsideTitle")}
          </h2>
          <p className={styles.muted}>
            {t("seasons.outsideText", {
              km: approxKm(zone.nearestCell.distanceDeg),
            })}
          </p>
          <Button to={PATHS.home} variant="outline">
            {t("seasons.outsideAction")}
          </Button>
        </section>
      </Card>
    );
  }
  return <CoveredZone zone={zone} />;
}

function CoveredZone({ zone }: { zone: ZoneCovered }) {
  const { t } = useTranslation();
  const { num } = useFormat();
  const { cell, normals, lastSeason: last, history, counts, reference } = zone;

  // Where spring heat means nothing (heatRelevant false), the name drops "hot"/"cool".
  const typeName = (id: SeasonTypeId) =>
    cell.heatRelevant
      ? t(`seasons.types.${id}.name`)
      : t(`seasons.types.${id}.nameNoHeat`);
  const typeShort = (id: SeasonTypeId) =>
    cell.heatRelevant
      ? t(`seasons.types.${id}.short`)
      : t(`seasons.types.${id}.nameNoHeat`);
  const pct = (value: number) => t("units.percent", { value: num(value, 0) });
  const historyValue = (s: SeasonEntry) =>
    t(s.borderline ? "seasons.historyBorderline" : "seasons.historyValue", {
      type: typeName(s.type),
      pct: num(s.rainPctNormal, 0),
    });

  const source = t("seasons.source", {
    from: reference.from,
    to: reference.to,
  });
  const shift = zone.advice.find((a) => a.id === "field_shift")?.evidence;

  const lastFacts = [
    {
      label: t("seasons.rain"),
      value: t("seasons.rainValue", {
        value: num(last.rainMm),
        normal: num(normals.rainMm),
      }),
    },
    ...(cell.heatRelevant
      ? [
          {
            label: t("seasons.hotDays"),
            value: t("seasons.hotDaysValue", {
              value: num(last.heatSpringDays, 0),
              normal: num(normals.heatSpringDays),
            }),
          },
        ]
      : []),
  ];

  return (
    <>
      <SeasonCard
        id="season-last"
        title={t("seasons.lastTitle", { season: formatSeason(last.season) })}
        icon={CloudSun}
        source={source}
      >
        {zone.status === "proche" ? (
          <p className={styles.note} data-zone="proche">
            <span className={styles.icon}>
              <Icon icon={Info} />
            </span>
            {t("seasons.nearbyNote", { km: approxKm(cell.distanceDeg) })}
          </p>
        ) : null}
        <p className={styles.type}>
          <Badge>{typeShort(last.type)}</Badge>
          <span className={styles.typeName}>{typeName(last.type)}</span>
        </p>
        <FactList facts={lastFacts} />
        <ProgressBar
          label={t("seasons.pctLabel")}
          // Capped at the normal: above 100 % the bar is full and the number says how much.
          value={Math.min(last.rainPctNormal, 100)}
          valueText={pct(last.rainPctNormal)}
        />
        {last.borderline ? (
          <p className={styles.note}>
            <span className={styles.icon}>
              <Icon icon={Info} />
            </span>
            {t("seasons.borderline")}
          </p>
        ) : null}
      </SeasonCard>

      <SeasonCard
        id="season-chart"
        title={t("seasons.chartTitle")}
        icon={ChartColumn}
        source={source}
      >
        <SeasonRainChart seasons={history} normalMm={normals.rainMm} />
      </SeasonCard>

      <SeasonCard
        id="season-history"
        title={t("seasons.historyTitle")}
        icon={History}
        source={source}
      >
        <p className={styles.strong}>
          {t("seasons.dryCount", {
            dry: counts.recent.byType.dry_hot,
            total: counts.recent.total,
          })}
        </p>
        <FactList
          // Most recent first.
          facts={[...history].reverse().map((s) => ({
            label: formatSeason(s.season),
            value: historyValue(s),
          }))}
        />
        {shift ? (
          <p className={styles.shift} data-advice="field_shift">
            <span className={styles.icon}>
              <Icon icon={Info} />
            </span>
            {t("seasons.fieldShift", {
              refFrom: counts.reference.from,
              refTo: counts.reference.to,
              recent: shift.recent,
              recentTotal: shift.recentTotal,
              since: formatSeason(shift.since),
              before: shift.before,
              beforeTotal: shift.beforeTotal,
              beforeFrom: formatSeason(shift.beforeFrom),
              beforeTo: formatSeason(shift.beforeTo),
            })}
          </p>
        ) : null}
      </SeasonCard>

      <SeasonCard
        id="season-moisture"
        title={t("seasons.moistureTitle")}
        icon={Droplets}
        source={source}
      >
        <ProgressBar
          label={t("seasons.moistureLabel", {
            season: formatSeason(last.season),
          })}
          value={last.gwetrootMean * 100}
          valueText={pct(last.gwetrootMean * 100)}
          tone="secondary"
        />
        <p className={styles.muted}>
          {t("seasons.moistureNormal", {
            value: num(normals.gwetrootMean * 100, 0),
          })}
        </p>
      </SeasonCard>
    </>
  );
}
