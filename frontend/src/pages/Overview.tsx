import type { LucideIcon } from "lucide-react";
import { CloudRain, MapPin, Thermometer } from "lucide-react";
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
 * Route "/overview" · design.md §7.3 Dashboard: stacked standard cards (summary stats, a chart,
 * progress-bar cards), then one primary CTA into Recommendations. Root header + tab bar.
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
          <ProgressBar
            label={t("overview.soilMoisture")}
            value={data.soilMoisturePercent}
          />
        </Card>

        <Card>
          <ProgressBar
            label={t("overview.healthIndex")}
            value={data.healthIndex.percent}
            valueText={t("overview.healthValue", data.healthIndex)}
          />
        </Card>

        <Button to={PATHS.recommendations} withArrow>
          {t("overview.seeRecommendations")}
        </Button>
      </div>
    </Screen>
  );
}
