import { CloudRain, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { type Fact, FactList } from "../components/FactList";
import { Header } from "../components/Header";
import { RequestStatus } from "../components/RequestStatus";
import { Screen } from "../components/Screen";
import { useFormat } from "../i18n/useFormat";
import { AppTabBar } from "../router/AppTabBar";
import { PATHS } from "../router/paths";
import { useSession } from "../state/session";
import { useParcelData } from "../state/useParcelData";
import type {
  BlockMeta,
  DiagnosticResponse,
  OkBlock,
} from "../types/diagnostic";
import styles from "./Home.module.css";
import { ParcelMap } from "./home/ParcelMap";
import { ParcelCoords } from "./parcel/ParcelCoords";

/**
 * Route "/home" · design.md §7.2 Home (the Home tab, the "quick glance" page): a real map
 * (Leaflet + OpenStreetMap) the farmer taps to drop a pin on their parcel, then a light summary
 * (the confirmed coordinates + 2 headline facts from the real diagnostic, never the full one)
 * and one primary CTA to Farm. Root header + tab bar (Home active).
 *
 * The pick is real coordinates kept in the app session, so Farm, Insights and Weather all use
 * the same point; the diagnostic fetched here is the same response Farm and Insights show.
 */
export function Home() {
  const { t } = useTranslation();
  const { maybe } = useFormat();
  const { parcel, pickParcel } = useSession();
  const { result, retry } = useParcelData("diagnostic");

  /** A headline value, or the §6 Data card wording when the source has nothing (never a 0). */
  const headline = <B extends BlockMeta>(
    block: B,
    render: (ok: OkBlock<B>) => string,
  ): string =>
    block.status === "ok"
      ? render(block as OkBlock<B>)
      : t(
          block.status === "indisponible"
            ? "dataCard.unavailable"
            : "dataCard.noDataShort",
        );

  const facts = ({ soil, climate }: DiagnosticResponse): Fact[] => [
    {
      label: t("home.soilTexture"),
      value: headline(soil, (s) =>
        s.texture_class
          ? t(`data.texture.${s.texture_class}`)
          : t("dataCard.valueMissing"),
      ),
      icon: Layers,
      tone: "soil",
    },
    {
      label: t("home.annualRain"),
      value: headline(climate, (c) =>
        maybe(c.rain_mm_year, (v) => t("units.mmPerYear", { value: v })),
      ),
      icon: CloudRain,
      tone: "water",
    },
  ];

  return (
    <Screen header={<Header title={t("home.title")} />} tabBar={<AppTabBar />}>
      <div className={styles.stack}>
        <p className={styles.intro}>
          {parcel ? t("home.introPicked") : t("home.intro")}
        </p>
        <ParcelMap value={parcel} onPick={pickParcel} />

        {parcel ? (
          <>
            <Card>
              <section className={styles.summary} aria-labelledby="home-parcel">
                <h2 id="home-parcel" className={styles.summaryTitle}>
                  {t("home.selected")}
                </h2>
                <ParcelCoords parcel={parcel} />
                {result?.state === "success" ? (
                  <>
                    <FactList facts={facts(result.data)} />
                    <p className={styles.source}>
                      {t("dataCard.source", {
                        source: [
                          ...new Set([
                            result.data.soil.source,
                            result.data.climate.source,
                          ]),
                        ].join(" · "),
                      })}
                    </p>
                  </>
                ) : null}
              </section>
            </Card>
            {result && result.state !== "success" ? (
              <RequestStatus state={result.state} onRetry={retry} />
            ) : null}
            <Button to={PATHS.farm} withArrow>
              {t("home.seeDiagnostic")}
            </Button>
          </>
        ) : null}
      </div>
    </Screen>
  );
}
