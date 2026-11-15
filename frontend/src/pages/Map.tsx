import { MapPin } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { PhotoFrame } from "../components/PhotoFrame";
import { SegmentedControl } from "../components/SegmentedControl";
import { Screen } from "../components/Screen";
import type { Language } from "../i18n";
import { mapData } from "../mocks/map";
import { AppTabBar } from "../router/AppTabBar";
import type { MapLayerId } from "../types/map";
import styles from "./Map.module.css";

/**
 * Locale used to format dates per UI language. "ar-MA" gives Moroccan month names (نونبر);
 * Western digits in every language (design.md §9a "Numerals").
 */
const DATE_LOCALE: Record<Language, string> = {
  ar: "ar-MA",
  fr: "fr-FR",
  en: "en-GB",
};

/** "2026-11-13" → "13 novembre 2026" / "13 November 2026" / "13 نونبر 2026". */
function formatDate(isoDate: string, language: string): string {
  const locale = DATE_LOCALE[language as Language] ?? language;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC", // an ISO date is UTC midnight: never shift it to the previous day
    numberingSystem: "latn",
  }).format(new Date(isoDate));
}

/**
 * Route "/map" · design.md §7 template 7 Map / Data layers: a large map PhotoFrame, a
 * segmented layer switcher (single select) and a legend/description card for the active layer,
 * with a data-recency note. Root header + tab bar (Map active). No real map or satellite
 * imagery yet: the frame is a §8 placeholder labelled with the active layer.
 * Named MapPage (not Map) so it never shadows the built-in Map.
 */
export function MapPage() {
  const { t, i18n } = useTranslation();
  const [layerId, setLayerId] = useState<MapLayerId>(mapData.defaultLayerId);
  const layer =
    mapData.layers.find((l) => l.id === layerId) ?? mapData.layers[0];
  const layerName = t(layer.labelKey);

  return (
    <Screen header={<Header title={t("map.title")} />} tabBar={<AppTabBar />}>
      <div className={styles.stack}>
        <div className={styles.map}>
          <PhotoFrame
            slot="farm"
            placeholderLabel={t("map.placeholder", {
              layer: layerName.toLocaleLowerCase(i18n.language),
            })}
          />
          <div className={styles.location}>
            <span className={styles.pin}>
              <Icon icon={MapPin} />
            </span>
            <Badge>{mapData.location}</Badge>
          </div>
        </div>

        <SegmentedControl
          ariaLabel={t("map.layerSwitcher")}
          options={mapData.layers.map((l) => ({
            value: l.id,
            label: t(l.labelKey),
          }))}
          value={layer.id}
          onChange={setLayerId}
        />

        <Card>
          {/* Polite live region: the new layer's details are announced after a switch. */}
          <section
            className={styles.details}
            aria-labelledby="map-layer-name"
            aria-live="polite"
          >
            <h2 id="map-layer-name" className={styles.layerName}>
              {layerName}
            </h2>
            <p className={styles.description}>{t(layer.descriptionKey)}</p>
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt className={styles.label}>{t("map.legend")}</dt>
                <dd className={styles.value}>{t(layer.legendKey)}</dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.label}>{t("map.unit")}</dt>
                <dd className={styles.value}>{t(layer.unitKey)}</dd>
              </div>
            </dl>
            <p className={styles.updated}>
              {t("map.lastUpdated", {
                date: formatDate(layer.lastUpdated, i18n.language),
              })}
            </p>
          </section>
        </Card>
      </div>
    </Screen>
  );
}
