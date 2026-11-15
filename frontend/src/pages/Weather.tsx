import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  Sun,
  Umbrella,
  Wind,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card } from "../components/Card";
import { DataCard } from "../components/DataCard";
import { FactList } from "../components/FactList";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Screen } from "../components/Screen";
import { formatNumber, formatWeekday } from "../i18n/format";
import { weatherData } from "../mocks/weather";
import { AppTabBar } from "../router/AppTabBar";
import { useSession } from "../state/session";
import type { WeatherCondition } from "../types/weather";
import { NoParcel } from "./parcel/NoParcel";
import styles from "./Weather.module.css";

/** One stroke icon per condition (design.md §5). */
const CONDITION_ICON: Record<WeatherCondition, LucideIcon> = {
  sunny: Sun,
  partlyCloudy: CloudSun,
  cloudy: Cloud,
  showers: CloudDrizzle,
  rain: CloudRain,
};

/**
 * Route "/weather" · design.md §7.8 Weather (the Weather tab), for the parcel already picked on
 * Home (no picker here; before any pick, the same empty state as Farm). A "today" summary as a
 * Data card (§6: source caption + ok / indisponible / pas de données, since the forecast API
 * can fail), then a horizontal row of 7 day cards (weekday, icon, high°/low°). Daily only: no
 * hourly breakdown, no metric tabs. The source is a forecast API, named visibly, never NASA
 * POWER (historical only). Root header + tab bar (Weather active).
 */
export function Weather() {
  const { t, i18n } = useTranslation();
  const { parcel } = useSession();
  const { location, forecast } = weatherData;
  const num = (value: number) => formatNumber(value, i18n.language);
  const conditionLabel = (c: WeatherCondition) => t(`weather.conditions.${c}`);

  return (
    <Screen
      header={<Header title={t("weather.title")} />}
      tabBar={<AppTabBar />}
    >
      {parcel ? (
        <div className={styles.stack}>
          <p className={styles.place}>
            <Icon icon={MapPin} />
            {location.name}
          </p>

          <DataCard
            title={t("weather.today")}
            icon={CloudSun}
            tone="neutral"
            result={forecast}
          >
            {({ today }) => (
              <>
                <div className={styles.now}>
                  <span className={styles.nowIcon}>
                    <Icon icon={CONDITION_ICON[today.condition]} size="data" />
                  </span>
                  <span className={styles.nowTemp}>
                    {t("units.celsius", { value: num(today.temp_c) })}
                  </span>{" "}
                  <span className={styles.condition}>
                    {conditionLabel(today.condition)}
                  </span>
                </div>
                <FactList
                  facts={[
                    {
                      label: t("weather.precipitation"),
                      value: t("units.percent", {
                        value: num(today.precip_probability_pct),
                      }),
                      icon: Umbrella,
                      tone: "water",
                    },
                    {
                      label: t("weather.humidity"),
                      value: t("units.percent", {
                        value: num(today.humidity_pct),
                      }),
                      icon: Droplets,
                      tone: "water",
                    },
                    {
                      label: t("weather.wind"),
                      value: t("units.kmh", { value: num(today.wind_kmh) }),
                      icon: Wind,
                      tone: "neutral",
                    },
                  ]}
                />
              </>
            )}
          </DataCard>

          {forecast.status === "ok" ? (
            <section className={styles.week} aria-labelledby="weather-week">
              <h2 id="weather-week" className={styles.sectionTitle}>
                {t("weather.next7")}
              </h2>
              {/* Scrolls sideways on narrow phones: focusable so keyboards can scroll it. */}
              <ol
                className={styles.days}
                aria-labelledby="weather-week"
                tabIndex={0}
              >
                {forecast.data.days.map((day) => (
                  <li key={day.date}>
                    <Card className={styles.day}>
                      <span className={styles.dayName}>
                        {formatWeekday(day.date, i18n.language)}
                      </span>{" "}
                      <Icon
                        icon={CONDITION_ICON[day.condition]}
                        label={conditionLabel(day.condition)}
                      />{" "}
                      <span className={styles.high}>
                        {t("weather.degrees", { value: num(day.temp_max_c) })}
                      </span>{" "}
                      <span className={styles.low}>
                        {t("weather.degrees", { value: num(day.temp_min_c) })}
                      </span>
                    </Card>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : (
        <NoParcel />
      )}
    </Screen>
  );
}
