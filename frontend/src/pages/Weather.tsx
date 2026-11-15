import type { LucideIcon } from "lucide-react";
import {
  CircleHelp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudSunRain,
  Droplets,
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
import { RequestStatus } from "../components/RequestStatus";
import { Screen } from "../components/Screen";
import { formatWeekday } from "../i18n/format";
import { useFormat } from "../i18n/useFormat";
import { AppTabBar } from "../router/AppTabBar";
import { useSession } from "../state/session";
import { useParcelData } from "../state/useParcelData";
import type { WeatherCondition } from "../types/weather";
import { NoParcel } from "./parcel/NoParcel";
import { ParcelCoords } from "./parcel/ParcelCoords";
import styles from "./Weather.module.css";

/**
 * One distinct stroke icon per condition the backend can send (design.md §5). A Record over
 * the WeatherCondition union: a condition without an icon is a compile error, not a blank.
 */
const CONDITION_ICON: Record<WeatherCondition, LucideIcon> = {
  sunny: Sun,
  partlyCloudy: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  showers: CloudSunRain,
  rain: CloudRain,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
  unknown: CircleHelp,
};

/**
 * Route "/weather" · design.md §7.8 Weather (the Weather tab), for the parcel already picked on
 * Home (no picker here; before any pick, the same empty state as Farm). Data: the backend's
 * `GET /api/weather/forecast` (Open-Meteo behind it), named visibly, never NASA POWER
 * (historical only). A "today" summary as a Data card (§6: source + ok / indisponible / pas de
 * données), then 7 day cards (weekday, icon, high°/low°). Daily only. Loading and backend-error
 * states per §6 Request states. Root header + tab bar (Weather active).
 */
export function Weather() {
  const { t, i18n } = useTranslation();
  const { maybe } = useFormat();
  const { parcel } = useSession();
  const { result, retry } = useParcelData("forecast");
  const conditionLabel = (c: WeatherCondition) => t(`weather.conditions.${c}`);
  const degrees = (value: number | null) =>
    maybe(value, (v) => t("weather.degrees", { value: v }), 0);

  const body = () => {
    if (!parcel || !result) return <NoParcel />;
    if (result.state !== "success") {
      return <RequestStatus state={result.state} onRetry={retry} />;
    }
    const forecast = result.data;
    return (
      <div className={styles.stack}>
        <ParcelCoords parcel={parcel} />

        <DataCard
          title={t("weather.today")}
          icon={CloudSun}
          tone="neutral"
          block={forecast}
          noDataText={t("dataCard.noData.forecast")}
        >
          {({ today }) => (
            <>
              <div className={styles.now}>
                <span className={styles.nowIcon}>
                  <Icon icon={CONDITION_ICON[today.condition]} size="data" />
                </span>
                <span className={styles.nowTemp}>
                  {maybe(today.temp_c, (v) => t("units.celsius", { value: v }))}
                </span>{" "}
                <span className={styles.condition}>
                  {conditionLabel(today.condition)}
                </span>
              </div>
              <FactList
                facts={[
                  {
                    label: t("weather.precipitation"),
                    value: maybe(today.precip_probability_pct, (v) =>
                      t("units.percent", { value: v }),
                    ),
                    icon: Umbrella,
                    tone: "water",
                  },
                  {
                    label: t("weather.humidity"),
                    value: maybe(today.humidity_pct, (v) =>
                      t("units.percent", { value: v }),
                    ),
                    icon: Droplets,
                    tone: "water",
                  },
                  {
                    label: t("weather.wind"),
                    value: maybe(today.wind_kmh, (v) =>
                      t("units.kmh", { value: v }),
                    ),
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
              {forecast.days.map((day) => (
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
                      {degrees(day.temp_max_c)}
                    </span>{" "}
                    <span className={styles.low}>
                      {degrees(day.temp_min_c)}
                    </span>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    );
  };

  return (
    <Screen
      header={<Header title={t("weather.title")} />}
      tabBar={<AppTabBar />}
    >
      {body()}
    </Screen>
  );
}
