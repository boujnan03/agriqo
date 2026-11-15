import type { LucideIcon } from "lucide-react";
import {
  CloudRain,
  Leaf,
  MapPin,
  Snowflake,
  Thermometer,
  ThermometerSnowflake,
  ThermometerSun,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { ProgressBar } from "../components/ProgressBar";
import { Screen } from "../components/Screen";
import { overviewData } from "../mocks/overview";
import { AppTabBar } from "../router/AppTabBar";
import { PATHS } from "../router/paths";
import { ClimateChart } from "./overview/ClimateChart";
import styles from "./Overview.module.css";

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
}

/**
 * Route "/overview" · design.md §7.4 Insights (the Insights tab): stacked standard cards (climate
 * summary: mean / min / max temperature + rainfall, the monthly chart, frost days, soil
 * moisture), the Health Index as an explicit "not yet available" placeholder (no NDVI source
 * yet, so no score is shown), then one primary CTA into Recommendations. Root header + tab bar.
 * Data comes from the mock fixture for now.
 */
export function Overview() {
  const { t } = useTranslation();
  const data = overviewData;
  const stats: Stat[] = [
    {
      label: t("overview.avgTemp"),
      value: t("overview.tempValue", { value: data.avgTemp }),
      icon: Thermometer,
    },
    {
      label: t("overview.minTemp"),
      value: t("overview.tempValue", { value: data.minTemp }),
      icon: ThermometerSnowflake,
    },
    {
      label: t("overview.maxTemp"),
      value: t("overview.tempValue", { value: data.maxTemp }),
      icon: ThermometerSun,
    },
    {
      label: t("overview.totalRainfall"),
      value: t("overview.rainValue", { value: data.totalRainfall }),
      icon: CloudRain,
    },
  ];

  return (
    <Screen
      header={<Header title={t("overview.title")} />}
      tabBar={<AppTabBar />}
    >
      <div className={styles.stack}>
        <Card>
          <section className={styles.section} aria-labelledby="climate-summary">
            <div className={styles.sectionHead}>
              <h2 id="climate-summary" className={styles.sectionTitle}>
                {t("overview.climateSummary")}
              </h2>
              <span className={styles.location}>
                <Icon icon={MapPin} />
                {data.location}
              </span>
            </div>
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
          </section>
        </Card>

        <Card>
          <section className={styles.section} aria-labelledby="climate-chart">
            <h2 id="climate-chart" className={styles.sectionTitle}>
              {t("overview.chartTitle")}
            </h2>
            <ClimateChart monthly={data.monthly} />
          </section>
        </Card>

        <Card>
          <dl className={styles.single}>
            <div className={styles.stat}>
              <dt className={styles.statLabel}>
                <span className={styles.statIcon}>
                  <Icon icon={Snowflake} />
                </span>
                {t("overview.frostDays")}
              </dt>
              <dd className={styles.statValue}>{data.frostDays}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <ProgressBar
            label={t("overview.soilMoisture")}
            value={data.soilMoisturePercent}
          />
        </Card>

        <Card>
          <section className={styles.section} aria-labelledby="health-index">
            <h2 id="health-index" className={styles.sectionTitle}>
              <span className={styles.statIcon}>
                <Icon icon={Leaf} />
              </span>
              {t("overview.healthIndex")}
            </h2>
            {/* Placeholder until a real NDVI source exists: no score, not even a fake one. */}
            <p className={styles.placeholder}>{t("overview.healthSoon")}</p>
          </section>
        </Card>

        <Button to={PATHS.recommendations} withArrow>
          {t("overview.seeRecommendations")}
        </Button>
      </div>
    </Screen>
  );
}
