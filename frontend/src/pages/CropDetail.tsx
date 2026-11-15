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
import { useSeasonZone } from "../hooks/useSeasonZone";
import { formatMonth } from "../i18n/format";
import { findCropDetail, isCropId } from "../mocks/cropDetails";
import { PATHS } from "../router/paths";
import type { CropDetail as CropDetailData } from "../types/cropDetail";
import { isShownAdvice, useAdviceText } from "./advice/useAdviceText";
import styles from "./CropDetail.module.css";
import { NotFound } from "./NotFound";
import type { CropId } from "../types/crop";

/**
 * Route "/crop/:id" · design.md §7.5 Detail: photo banner (gradient, crop name + badge), icon-
 * labeled fact rows, one "why" box, one primary CTA. Back-arrow header, NO tab bar.
 * An unknown id renders the §7.6 Not found page.
 *
 * The crop facts and the "why" text are mock data (marked "Exemple"). The "why" box ADDS one
 * real "Climat de votre zone" paragraph per advice of the season endpoint whose `crops`
 * include this crop (same wording and reason as its Advice card on Recommendations); none
 * applies → nothing is added.
 */
export function CropDetail() {
  const { id = "" } = useParams();
  const crop = findCropDetail(id);
  if (!crop) return <NotFound />;
  // Keyed by id so the "saved" confirmation resets when moving to another crop.
  return (
    <CropDetailScreen
      key={id}
      cropId={id as CropId}
      crop={crop}
      illustration={isCropId(id) ? cropIllustrations[id] : undefined}
    />
  );
}

function CropDetailScreen({
  cropId,
  crop,
  illustration,
}: {
  cropId: CropId;
  crop: CropDetailData;
  /** Banner image; undefined falls back to the §8 placeholder. */
  illustration: string | undefined;
}) {
  const { t, i18n } = useTranslation();
  const [saved, setSaved] = useState(false);
  // Every word is translated (crops.<id>.*); the fixture holds only ids and levels.
  const name = t(`crops.${cropId}.name`);
  const months = t("crops.monthRange", {
    from: formatMonth(crop.bestSeason.from, i18n.language),
    to: formatMonth(crop.bestSeason.to, i18n.language),
  });
  const { result } = useSeasonZone();
  const { text, why } = useAdviceText();
  // Real advice concerning this crop, if the season answer for the parcel has arrived.
  const zone =
    result?.state === "success" && result.data.status !== "hors_zone"
      ? result.data
      : null;
  const climate = zone
    ? zone.advice.filter(isShownAdvice).filter((a) => a.crops.includes(cropId))
    : [];

  const facts: Fact[] = [
    {
      label: t("cropDetail.waterNeed"),
      value: t(`crops.level.${crop.waterNeed}`),
      icon: Droplets,
      tone: "water",
    },
    {
      label: t("cropDetail.bestSeason"),
      value: months,
      icon: CalendarDays,
      tone: "neutral",
    },
    {
      label: t("cropDetail.expectedYield"),
      value: t(`crops.level.${crop.expectedYield}`),
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
                // The translated name, lower-cased by the active language's rules.
                name: name.toLocaleLowerCase(i18n.language),
              }),
            )}
            className={styles.photo}
          />
          <div className={styles.bannerText}>
            <h2 className={styles.cropName}>{name}</h2>
            {crop.recommended ? (
              <Badge>{t("cropDetail.recommended")}</Badge>
            ) : null}
          </div>
        </div>

        <p className={styles.description}>{t(`crops.${cropId}.description`)}</p>

        <Card>
          <FactList facts={facts} />
        </Card>

        <Card variant="featured">
          <section className={styles.why} aria-labelledby="why-this-choice">
            <h3 id="why-this-choice" className={styles.whyTitle}>
              {t("cropDetail.why")} <Badge>{t("common.example")}</Badge>
            </h3>
            <p className={styles.whyText} data-example="why">
              {t(`crops.${cropId}.why`)}
            </p>
            {zone && climate.length > 0 ? (
              <>
                {climate.map((a) => (
                  <p key={a.id} className={styles.whyText} data-advice={a.id}>
                    <strong>{t("advice.cropClimate")}</strong> {text(a)}{" "}
                    {why(a)}
                  </p>
                ))}
                <p className={styles.caveat}>
                  {t("advice.source", {
                    from: zone.reference.from,
                    to: zone.reference.to,
                  })}{" "}
                  {t("advice.validate")}
                </p>
              </>
            ) : null}
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
