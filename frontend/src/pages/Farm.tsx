import { Droplets, Layers, MapPin, Mountain, Thermometer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataCard } from "../components/DataCard";
import { FactList } from "../components/FactList";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Screen } from "../components/Screen";
import { formatNumber } from "../i18n/format";
import { farmDiagnostic } from "../mocks/farmDiagnostic";
import { AppTabBar } from "../router/AppTabBar";
import { useSession } from "../state/session";
import styles from "./Farm.module.css";
import { NoParcel } from "./parcel/NoParcel";

/**
 * Route "/farm" · design.md §7.3 Farm (the Farm tab, the full diagnostic): four Data cards
 * (§6), Sol · Climat · Humidité · Relief, for the parcel picked on Home. Data only, no photo
 * banner. Root header + tab bar (Farm active). Before any pick: the short empty state that
 * points back to Home. Data comes from the mock fixture for now; each card shows its source
 * and its own status, so a failed source never borrows a value from anywhere.
 */
export function Farm() {
  const { t, i18n } = useTranslation();
  const { parcelPicked } = useSession();
  const { location, soil, climate, humidity, relief } = farmDiagnostic;
  const num = (value: number) => formatNumber(value, i18n.language);

  return (
    <Screen header={<Header title={t("farm.title")} />} tabBar={<AppTabBar />}>
      {parcelPicked ? (
        <div className={styles.stack}>
          <p className={styles.place}>
            <Icon icon={MapPin} />
            {location.name}
          </p>

          <DataCard
            title={t("farm.soil")}
            icon={Layers}
            tone="soil"
            result={soil}
          >
            {(s) => (
              <FactList
                facts={[
                  {
                    label: t("farm.texture"),
                    value: t(`data.texture.${s.texture_class}`),
                  },
                  { label: t("farm.ph"), value: num(s.ph) },
                  {
                    label: t("farm.organicCarbon"),
                    value: t("units.gPerKg", {
                      value: num(s.organic_carbon_g_kg),
                    }),
                  },
                ]}
              />
            )}
          </DataCard>

          <DataCard
            title={t("farm.climate")}
            icon={Thermometer}
            tone="neutral"
            result={climate}
          >
            {(c) => (
              <FactList
                facts={[
                  {
                    label: t("farm.tempMean"),
                    value: t("units.celsius", { value: num(c.temp_mean_c) }),
                  },
                  {
                    label: t("farm.tempMax"),
                    value: t("units.celsius", { value: num(c.temp_max_c) }),
                  },
                  {
                    label: t("farm.rainYear"),
                    value: t("units.mmPerYear", {
                      value: num(c.rain_mm_year),
                    }),
                  },
                  { label: t("farm.frostDays"), value: num(c.frost_days) },
                ]}
              />
            )}
          </DataCard>

          <DataCard
            title={t("farm.humidity")}
            icon={Droplets}
            tone="water"
            result={humidity}
          >
            {(h) => (
              <FactList
                facts={[
                  {
                    label: t("farm.surfaceWetness"),
                    value: t("units.percent", { value: num(h.value_pct) }),
                  },
                  {
                    label: t("farm.level"),
                    value: t(`data.humidityLevel.${h.level}`),
                  },
                ]}
              />
            )}
          </DataCard>

          <DataCard
            title={t("farm.relief")}
            icon={Mountain}
            tone="neutral"
            result={relief}
          >
            {(r) => (
              <FactList
                facts={[
                  {
                    label: t("farm.altitude"),
                    value: t("units.meters", { value: num(r.altitude_m) }),
                  },
                  {
                    label: t("farm.slope"),
                    value: t("units.percent", { value: num(r.slope_pct) }),
                  },
                ]}
              />
            )}
          </DataCard>
        </div>
      ) : (
        <NoParcel />
      )}
    </Screen>
  );
}
