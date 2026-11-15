import { useTranslation } from "react-i18next";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Header } from "../components/Header";
import { Screen } from "../components/Screen";
import { AppTabBar } from "../router/AppTabBar";
import { PATHS } from "../router/paths";
import { useSession } from "../state/session";
import styles from "./Home.module.css";
import { ParcelMap } from "./home/ParcelMap";
import { ParcelCoords } from "./parcel/ParcelCoords";

/**
 * Route "/home" · design.md §7.2 Home (the Home tab, the "quick glance" page): a real map
 * (Leaflet + OpenStreetMap) the farmer taps to drop a pin on their parcel, then a light summary
 * (the confirmed coordinates) and one primary CTA to Farm. Root header + tab bar (Home active).
 *
 * The pick is real coordinates kept in the app session, so Farm, Insights and Weather all use
 * the same point. Tapping again moves the pin.
 */
export function Home() {
  const { t } = useTranslation();
  const { parcel, pickParcel } = useSession();

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
