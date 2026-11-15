import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  CloudRain,
  Droplets,
  Leaf,
  Snowflake,
  Thermometer,
  ThermometerSun,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataCard } from "../components/DataCard";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { ProgressBar } from "../components/ProgressBar";
import { RequestStatus } from "../components/RequestStatus";
import { Screen } from "../components/Screen";
import { useFormat } from "../i18n/useFormat";
import { AppTabBar } from "../router/AppTabBar";
import { PATHS } from "../router/paths";
import { useSession } from "../state/session";
import { useParcelData } from "../state/useParcelData";
import styles from "./Overview.module.css";
import { NoParcel } from "./parcel/NoParcel";
import { ParcelCoords } from "./parcel/ParcelCoords";

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
}

/** A stack of labeled values (the climate summary row). */
function Stats({ stats }: { stats: Stat[] }) {
  return (
    <dl className={styles.stats}>
      {stats.map((stat) => (
        <div key={stat.label} className={styles.stat}>
          <dt className={styles.statLabel}>
            <span className={styles.statIcon}>
              <Icon icon={stat.icon} />
            </span>
            {stat.label}
          </dt>
          <dd className={styles.statValue}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Route "/overview" · design.md §7.4 Insights (the Insights tab), for the parcel picked on Home.
 * It reuses the SAME diagnostic response as Farm and Home (one request, shared by the session):
 * climate summary (mean temperature, typical high, annual rainfall), frost days, soil moisture,
 * each as a Data card with its own source and status.
 *
 * Not shown, because the backend does not send them (never filled with made-up values):
 * - the monthly chart: POWER's monthly climatology is fetched by the backend but not returned
 *   yet, so the chart card says "not available yet" (ClimateChart is kept for when it is);
 * - a minimum temperature: the response has no typical low.
 * The Health Index stays an explicit placeholder (no NDVI source). Then one CTA into
 * Recommendations. Root header + tab bar.
 */
export function Overview() {
  const { t } = useTranslation();
  const { maybe } = useFormat();
  const { parcel } = useSession();
  const { result, retry } = useParcelData("diagnostic");

  const placeholderCard = (
    id: string,
    title: string,
    icon: LucideIcon,
    text: string,
  ) => (
    <Card>
      <section className={styles.section} aria-labelledby={id}>
        <h2 id={id} className={styles.sectionTitle}>
          <span className={styles.statIcon}>
            <Icon icon={icon} />
          </span>
          {title}
        </h2>
        <p className={styles.placeholder}>{text}</p>
      </section>
    </Card>
  );

  const data = () => {
    if (!parcel || !result) return <NoParcel />;
    if (result.state !== "success") {
      return <RequestStatus state={result.state} onRetry={retry} />;
    }
    const { climate, soil_moisture } = result.data;
    return (
      <>
        <ParcelCoords parcel={parcel} />

        <DataCard
          title={t("overview.climateSummary")}
          icon={Thermometer}
          tone="neutral"
          block={climate}
          noDataText={t("dataCard.noData.climate")}
          caveat={
            climate.status === "ok" && climate.climatology_period
              ? t("overview.climatePeriod", {
                  period: climate.climatology_period,
                })
              : undefined
          }
        >
          {(c) => (
            <Stats
              stats={[
                {
                  label: t("overview.avgTemp"),
                  value: maybe(c.temp_mean_c, (v) =>
                    t("overview.tempValue", { value: v }),
                  ),
                  icon: Thermometer,
                },
                {
                  label: t("overview.maxTemp"),
                  value: maybe(c.temp_max_c, (v) =>
                    t("overview.tempValue", { value: v }),
                  ),
                  icon: ThermometerSun,
                },
                {
                  label: t("overview.annualRainfall"),
                  value: maybe(c.rain_mm_year, (v) =>
                    t("units.mmPerYear", { value: v }),
                  ),
                  icon: CloudRain,
                },
              ]}
            />
          )}
        </DataCard>

        {placeholderCard(
          "climate-chart",
          t("overview.chartTitle"),
          CalendarRange,
          t("overview.chartUnavailable"),
        )}

        <DataCard
          title={t("overview.frostDays")}
          icon={Snowflake}
          tone="neutral"
          block={climate}
          noDataText={t("dataCard.noData.climate")}
          caveat={
            climate.status === "ok" && climate.frost_days_period
              ? t("overview.frostPeriod", climate.frost_days_period)
              : undefined
          }
        >
          {(c) => <p className={styles.statValue}>{maybe(c.frost_days)}</p>}
        </DataCard>

        <DataCard
          title={t("overview.soilMoisture")}
          icon={Droplets}
          tone="water"
          block={soil_moisture}
          noDataText={t("dataCard.noData.soil_moisture")}
        >
          {(m) =>
            m.gwettop === null ? (
              <p className={styles.placeholder}>{t("dataCard.valueMissing")}</p>
            ) : (
              <ProgressBar
                label={t("overview.surfaceWetness")}
                value={m.gwettop * 100}
              />
            )
          }
        </DataCard>
      </>
    );
  };

  return (
    <Screen
      header={<Header title={t("overview.title")} />}
      tabBar={<AppTabBar />}
    >
      <div className={styles.stack}>
        {data()}

        {placeholderCard(
          "health-index",
          t("overview.healthIndex"),
          Leaf,
          // Placeholder until a real NDVI source exists: no score, not even a fake one.
          t("overview.healthSoon"),
        )}

        <Button to={PATHS.recommendations} withArrow>
          {t("overview.seeRecommendations")}
        </Button>
      </div>
    </Screen>
  );
}
