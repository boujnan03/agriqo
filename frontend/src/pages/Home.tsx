import { CloudRain, Layers, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

import { illustrations } from "../assets/images";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { type Fact, FactList } from "../components/FactList";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { PhotoFrame } from "../components/PhotoFrame";
import { Screen } from "../components/Screen";
import { formatNumber } from "../i18n/format";
import { homeSummary } from "../mocks/home";
import { AppTabBar } from "../router/AppTabBar";
import { PATHS } from "../router/paths";
import { useSession } from "../state/session";
import type { SourcedData } from "../types/diagnostic";
import styles from "./Home.module.css";

/**
 * Route "/home" · design.md §7.2 Home (the Home tab, the "quick glance" page): a ~4:3 map
 * banner the farmer taps to pick their parcel, then a light summary (the confirmed location +
 * 2 headline facts, never the full diagnostic) and one primary CTA to Farm. Root header + tab
 * bar (Home active).
 *
 * No real map library yet: tapping the map simulates the pick (one mock parcel) and drops the
 * pin + location chip on it. The pick is kept in the app session, so Farm and Weather know it.
 */
export function Home() {
  const { t, i18n } = useTranslation();
  const { parcelPicked, pickParcel } = useSession();
  const { location, soil, climate } = homeSummary;

  /** A headline value, or the §6 Data card wording when the source has nothing (never a 0). */
  const headline = <T,>(
    result: SourcedData<T>,
    format: (data: T) => string,
  ): string =>
    result.status === "ok"
      ? format(result.data)
      : t(
          result.status === "indisponible"
            ? "dataCard.unavailable"
            : "dataCard.noDataShort",
        );

  const facts: Fact[] = [
    {
      label: t("home.soilTexture"),
      value: headline(soil, (d) => t(`data.texture.${d.texture_class}`)),
      icon: Layers,
      tone: "soil",
    },
    {
      label: t("home.annualRain"),
      value: headline(climate, (d) =>
        t("units.mmPerYear", {
          value: formatNumber(d.rain_mm_year, i18n.language),
        }),
      ),
      icon: CloudRain,
      tone: "water",
    },
  ];
  const sources = [...new Set([soil.source, climate.source])].join(" · ");

  const map = (
    <PhotoFrame slot="farm" src={illustrations.farm} alt={t("home.mapAlt")} />
  );

  return (
    <Screen header={<Header title={t("home.title")} />} tabBar={<AppTabBar />}>
      <div className={styles.stack}>
        {parcelPicked ? (
          // Pin + chip are real UI: they stay on top of the real map image later (§8).
          <div className={styles.map}>
            {map}
            <div className={styles.location}>
              <span className={styles.pin}>
                <Icon icon={MapPin} />
              </span>
              <Badge>{location.name}</Badge>
            </div>
          </div>
        ) : (
          <>
            <p className={styles.intro}>{t("home.intro")}</p>
            <button
              type="button"
              className={`${styles.map} ${styles.pickButton}`}
              aria-label={t("home.pick")}
              onClick={pickParcel}
            >
              {map}
            </button>
          </>
        )}

        {parcelPicked ? (
          <>
            <Card>
              <section className={styles.summary} aria-labelledby="home-parcel">
                <h2 id="home-parcel" className={styles.summaryTitle}>
                  {t("home.selected")}
                </h2>
                <span className={styles.place}>
                  <Icon icon={MapPin} />
                  {location.name}
                </span>
                <FactList facts={facts} />
                <p className={styles.source}>
                  {t("dataCard.source", { source: sources })}
                </p>
              </section>
            </Card>
            <Button to={PATHS.farm} withArrow>
              {t("home.seeDiagnostic")}
            </Button>
          </>
        ) : null}
      </div>
    </Screen>
  );
}
