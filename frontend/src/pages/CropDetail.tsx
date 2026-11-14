import { CalendarDays, Droplets, Wheat } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";

import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { type Fact, FactList } from "../components/FactList";
import { Header } from "../components/Header";
import { PhotoFrame } from "../components/PhotoFrame";
import { Screen } from "../components/Screen";
import { findCropDetail } from "../mocks/cropDetails";
import { PATHS } from "../router/paths";
import type { CropDetail as CropDetailData } from "../types/cropDetail";
import styles from "./CropDetail.module.css";
import { NotFound } from "./NotFound";

/**
 * Route "/crop/:id" · design.md §7.5 Detail: photo banner (gradient, crop name + badge), icon-
 * labeled fact rows, one "why" box, one primary CTA. Back-arrow header, NO tab bar.
 * An unknown id renders the §7.6 Not found page.
 */
export function CropDetail() {
  const { id = "" } = useParams();
  const crop = findCropDetail(id);
  if (!crop) return <NotFound />;
  // Keyed by id so the "saved" confirmation resets when moving to another crop.
  return <CropDetailScreen key={id} crop={crop} />;
}

function CropDetailScreen({ crop }: { crop: CropDetailData }) {
  const [saved, setSaved] = useState(false);

  const facts: Fact[] = [
    {
      label: "Besoin en eau",
      value: crop.waterNeed,
      icon: Droplets,
      tone: "water",
    },
    {
      label: "Meilleure saison",
      value: crop.bestSeason,
      icon: CalendarDays,
      tone: "neutral",
    },
    {
      label: "Rendement attendu",
      value: crop.expectedYield,
      icon: Wheat,
      tone: "plant",
    },
  ];

  return (
    <Screen
      header={
        <Header
          variant="drill-in"
          title="Détails"
          backTo={PATHS.recommendations}
          backLabel="Retour aux recommandations"
        />
      }
    >
      <div className={styles.stack}>
        <div className={styles.banner}>
          <PhotoFrame
            slot="detail"
            placeholderLabel={`Photo : ${crop.name.toLocaleLowerCase("fr")}`}
            className={styles.photo}
          />
          <div className={styles.bannerText}>
            <h2 className={styles.cropName}>{crop.name}</h2>
            {crop.recommended ? <Badge>Recommandé</Badge> : null}
          </div>
        </div>

        <p className={styles.description}>{crop.description}</p>

        <Card>
          <FactList facts={facts} />
        </Card>

        <Card variant="featured">
          <section className={styles.why} aria-labelledby="why-this-choice">
            <h3 id="why-this-choice" className={styles.whyTitle}>
              Pourquoi ce choix ?
            </h3>
            <p className={styles.whyText}>{crop.whyThisChoice}</p>
          </section>
        </Card>

        {/* No persistence yet: the button only shows a local confirmation. */}
        <Button withArrow onClick={() => setSaved(true)}>
          Enregistrer ce plan
        </Button>
        <p className={styles.status} role="status">
          {saved
            ? "Plan enregistré pour cette session (démo : rien n'est sauvegardé)."
            : ""}
        </p>
      </div>
    </Screen>
  );
}
