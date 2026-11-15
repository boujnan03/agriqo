import { Droplets, Layers, Mountain, Thermometer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataCard } from "../components/DataCard";
import { FactList } from "../components/FactList";
import { Header } from "../components/Header";
import { RequestStatus } from "../components/RequestStatus";
import { Screen } from "../components/Screen";
import { useFormat } from "../i18n/useFormat";
import { AppTabBar } from "../router/AppTabBar";
import { useSession } from "../state/session";
import { useParcelData } from "../state/useParcelData";
import styles from "./Farm.module.css";
import { NoParcel } from "./parcel/NoParcel";
import { ParcelCoords } from "./parcel/ParcelCoords";

/**
 * Route "/farm" · design.md §7.3 Farm (the Farm tab, the full diagnostic): four Data cards
 * (§6), Sol · Climat · Humidité · Relief, for the parcel picked on Home, straight from the
 * backend's `POST /api/parcel/diagnostic`. Each card takes its `status` and `source` from its
 * own block, so a failed source shows "unavailable" without borrowing a value from anywhere.
 *
 * Page states (§6 Request states): no parcel → empty state pointing back to Home; request in
 * flight → loading; our backend unreachable → error + retry. Data only, no photo banner.
 */
export function Farm() {
  const { t } = useTranslation();
  const { maybe } = useFormat();
  const { parcel } = useSession();
  const { result, retry } = useParcelData("diagnostic");

  const body = () => {
    if (!parcel || !result) return <NoParcel />;
    if (result.state !== "success") {
      return <RequestStatus state={result.state} onRetry={retry} />;
    }
    const { soil, climate, soil_moisture, terrain } = result.data;
    return (
      <div className={styles.stack}>
        <ParcelCoords parcel={parcel} />

        <DataCard
          title={t("farm.soil")}
          icon={Layers}
          tone="soil"
          block={soil}
          noDataText={t("dataCard.noData.soil")}
          caveat={t("farm.soilCaveat")}
        >
          {(s) => (
            <FactList
              facts={[
                {
                  label: t("farm.texture"),
                  value: s.texture_class
                    ? t(`data.texture.${s.texture_class}`)
                    : t("dataCard.valueMissing"),
                },
                { label: t("farm.ph"), value: maybe(s.ph) },
                {
                  label: t("farm.organicCarbon"),
                  value: maybe(s.organic_carbon_g_kg, (v) =>
                    t("units.gPerKg", { value: v }),
                  ),
                },
              ]}
            />
          )}
        </DataCard>

        <DataCard
          title={t("farm.climate")}
          icon={Thermometer}
          tone="neutral"
          block={climate}
          noDataText={t("dataCard.noData.climate")}
          caveat={t("farm.climateCaveat")}
        >
          {(c) => (
            <FactList
              facts={[
                {
                  label: t("farm.tempMean"),
                  value: maybe(c.temp_mean_c, (v) =>
                    t("units.celsius", { value: v }),
                  ),
                },
                {
                  label: t("farm.tempMax"),
                  value: maybe(c.temp_max_c, (v) =>
                    t("units.celsius", { value: v }),
                  ),
                },
                {
                  label: t("farm.rainYear"),
                  value: maybe(c.rain_mm_year, (v) =>
                    t("units.mmPerYear", { value: v }),
                  ),
                },
                { label: t("farm.frostDays"), value: maybe(c.frost_days) },
              ]}
            />
          )}
        </DataCard>

        <DataCard
          title={t("farm.humidity")}
          icon={Droplets}
          tone="water"
          block={soil_moisture}
          noDataText={t("dataCard.noData.soil_moisture")}
          caveat={
            soil_moisture.status === "ok" && soil_moisture.date
              ? t("farm.moistureCaveat", { date: soil_moisture.date })
              : undefined
          }
        >
          {(m) => (
            <FactList
              facts={[
                {
                  label: t("farm.surfaceWetness"),
                  // GWETTOP is a 0–1 wetness fraction: shown as a percentage.
                  value: maybe(
                    m.gwettop === null ? null : m.gwettop * 100,
                    (v) => t("units.percent", { value: v }),
                    0,
                  ),
                },
                {
                  label: t("farm.level"),
                  value: m.label
                    ? t(`data.humidityLevel.${m.label}`)
                    : t("dataCard.valueMissing"),
                },
              ]}
            />
          )}
        </DataCard>

        <DataCard
          title={t("farm.relief")}
          icon={Mountain}
          tone="neutral"
          block={terrain}
          noDataText={t("dataCard.noData.terrain")}
        >
          {(r) => (
            <FactList
              facts={[
                {
                  label: t("farm.altitude"),
                  value: maybe(r.altitude, (v) =>
                    t("units.meters", { value: v }),
                  ),
                },
                {
                  label: t("farm.slope"),
                  value: maybe(r.slope_pct, (v) =>
                    t("units.percent", { value: v }),
                  ),
                },
              ]}
            />
          )}
        </DataCard>
      </div>
    );
  };

  return (
    <Screen header={<Header title={t("farm.title")} />} tabBar={<AppTabBar />}>
      {body()}
    </Screen>
  );
}
