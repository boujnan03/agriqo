import { CalendarDays, Droplets, Wheat } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { cropIllustrations, photo } from "../assets/images";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { type Fact, FactList } from "../components/FactList";
import { Header } from "../components/Header";
import { PhotoFrame } from "../components/PhotoFrame";
import { Screen } from "../components/Screen";
import { findCropDetail, isCropId } from "../mocks/cropDetails";
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
  return (
    <CropDetailScreen
      key={id}
      crop={crop}
      illustration={isCropId(id) ? cropIllustrations[id] : undefined}
    />
  );
}

function CropDetailScreen({
  crop,
  illustration,
}: {
  crop: CropDetailData;
  /** Banner image; undefined falls back to the §8 placeholder. */
  illustration: string | undefined;
}) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);

  const facts: Fact[] = [
    {
      label: t("cropDetail.waterNeed"),
      value: crop.waterNeed,
      icon: Droplets,
      tone: "water",
    },
    {
      label: t("cropDetail.bestSeason"),
      value: crop.bestSeason,
      icon: CalendarDays,
      tone: "neutral",
    },
    {
      label: t("cropDetail.expectedYield"),
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
          title={t("cropDetail.title")}
          backTo={PATHS.recommendations}
          backLabel={t("cropDetail.back")}
        />
      }
    >
      <div className={styles.stack}>
        <div className={styles.banner}>
          <PhotoFrame
            slot="detail"
            {...photo(
              illustration,
              t("common.photo", {
                // Crop names are French fixture data, hence the "fr" lower-casing.
                name: crop.name.toLocaleLowerCase("fr"),
              }),
            )}
            className={styles.photo}
          />
          <div className={styles.bannerText}>
            <h2 className={styles.cropName}>{crop.name}</h2>
            {crop.recommended ? (
              <Badge>{t("cropDetail.recommended")}</Badge>
            ) : null}
          </div>
        </div>

        <p className={styles.description}>{crop.description}</p>

        <Card>
          <FactList facts={facts} />
        </Card>

        <Card variant="featured">
          <section className={styles.why} aria-labelledby="why-this-choice">
            <h3 id="why-this-choice" className={styles.whyTitle}>
              {t("cropDetail.why")}
            </h3>
            <p className={styles.whyText}>{crop.whyThisChoice}</p>
          </section>
        </Card>

        {/* No persistence yet: the button only shows a local confirmation. */}
        <Button withArrow onClick={() => setSaved(true)}>
          {t("cropDetail.save")}
        </Button>
        <p className={styles.status} role="status">
          {saved ? t("cropDetail.saved") : ""}
        </p>
      </div>
    </Screen>
  );
}
