import { Droplets, Layers, MapPin, Wheat } from "lucide-react";

import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { type Fact, FactList } from "../components/FactList";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { PhotoFrame } from "../components/PhotoFrame";
import { Screen } from "../components/Screen";
import { farmData } from "../mocks/farm";
import { AppTabBar } from "../router/AppTabBar";
import { PATHS } from "../router/paths";
import styles from "./Farm.module.css";

/**
 * Route "/farm" · design.md §7.2 Map/Data-entry: map banner, icon-labeled fact rows, one
 * primary CTA. Root header (title only) + tab bar. Data comes from the mock fixture for now.
 */
export function Farm() {
  const facts: Fact[] = [
    {
      label: "Type de sol",
      value: farmData.soilType,
      icon: Layers,
      tone: "soil",
    },
    {
      label: "Disponibilité en eau",
      value: farmData.waterAvailability,
      icon: Droplets,
      tone: "water",
    },
    {
      label: "Culture actuelle",
      value: farmData.currentCrop,
      icon: Wheat,
      tone: "plant",
    },
  ];

  return (
    <Screen header={<Header title="Votre ferme" />} tabBar={<AppTabBar />}>
      <div className={styles.stack}>
        {/* Pin + chip are real UI: they stay on top of the real map image later (§8). */}
        <div className={styles.map}>
          <PhotoFrame
            slot="farm"
            placeholderLabel="Carte : vue satellite de la parcelle"
          />
          <div className={styles.location}>
            <span className={styles.pin}>
              <Icon icon={MapPin} />
            </span>
            <Badge>{farmData.location}</Badge>
          </div>
        </div>

        <section className={styles.section} aria-labelledby="farm-details">
          <h2 id="farm-details" className={styles.sectionTitle}>
            Détails de la ferme
          </h2>
          <Card>
            <FactList facts={facts} />
          </Card>
        </section>

        <Button to={PATHS.overview} withArrow>
          Analyser ma ferme
        </Button>
      </div>
    </Screen>
  );
}
