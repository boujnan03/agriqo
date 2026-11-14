import type { LucideIcon } from "lucide-react";
import { CloudRain, MapPin, Thermometer } from "lucide-react";

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

/** French typography: a non-breaking space between a number and its unit ("24 °C"). */
const NBSP = String.fromCharCode(0xa0);

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
  const data = overviewData;
  const stats: Stat[] = [
    {
      label: "Température moyenne",
      value: `${data.avgTemp}${NBSP}°C`,
      icon: Thermometer,
    },
    {
      label: "Précipitations totales",
      value: `${data.totalRainfall}${NBSP}mm`,
      icon: CloudRain,
    },
  ];

  return (
    <Screen
      header={<Header title="Aperçu de la ferme" />}
      tabBar={<AppTabBar />}
    >
      <div className={styles.stack}>
        <Card>
          <section className={styles.section} aria-labelledby="climate-summary">
            <div className={styles.sectionHead}>
              <h2 id="climate-summary" className={styles.sectionTitle}>
                Résumé climatique
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
              Température et précipitations
            </h2>
            <ClimateChart monthly={data.monthly} />
          </section>
        </Card>

        <Card>
          <ProgressBar
            label="Humidité du sol"
            value={data.soilMoisturePercent}
          />
        </Card>

        <Card>
          <ProgressBar
            label="Indice de santé"
            value={data.healthIndex.percent}
            valueText={`${data.healthIndex.label} · ${data.healthIndex.percent}%`}
          />
        </Card>

        <Button to={PATHS.recommendations} withArrow>
          Voir mes recommandations
        </Button>
      </div>
    </Screen>
  );
}
