import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { cropIllustrations, photo } from "../assets/images";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { PhotoFrame } from "../components/PhotoFrame";
import { Screen } from "../components/Screen";
import { useDirection } from "../i18n/useDirection";
import { recommendationsData } from "../mocks/recommendations";
import { cropPath, PATHS } from "../router/paths";
import styles from "./Recommendations.module.css";
import { ClimateAdvice } from "./recommendations/ClimateAdvice";

/**
 * Route "/recommendations" · design.md §7 template 5 Recommendation list. First, REAL data:
 * "Ce que dit le climat de votre zone" — one Advice card per advice of the season endpoint
 * (ClimateAdvice). Then the crop ranking, still mock data and marked "Exemple": one featured
 * card (the screen's only featured card), a row of smaller option cards (photo + name + %), a
 * stepped rotation plan, one primary CTA.
 * Drill-in screen (team decision, overrides §7.4's tab bar): back-arrow header to the
 * dashboard, NO tab bar. Every card / step is a real link to its crop's detail page (§9).
 */
export function Recommendations() {
  const { t } = useTranslation();
  // Each step's chevron points forward in the reading direction (design.md §9a).
  const StepChevron = useDirection() === "rtl" ? ChevronLeft : ChevronRight;
  const { featured, otherOptions, rotationPlan } = recommendationsData;
  /** design.md §8 placeholder label for a crop photo. Crop names are French fixture data. */
  const photoLabel = (cropName: string): string =>
    t("common.photo", { name: cropName.toLocaleLowerCase("fr") });

  return (
    <Screen
      header={
        <Header
          variant="drill-in"
          title={t("recommendations.title")}
          backTo={PATHS.overview}
          backLabel={t("recommendations.back")}
        />
      }
    >
      <div className={styles.stack}>
        <section className={styles.section} aria-labelledby="climate-advice">
          <h2 id="climate-advice" className={styles.sectionTitle}>
            {t("recommendations.climateTitle")}
          </h2>
          <ClimateAdvice />
        </section>

        <section className={styles.section} aria-labelledby="crop-ranking">
          <h2 id="crop-ranking" className={styles.sectionTitle}>
            {t("recommendations.crops")} <Badge>{t("common.example")}</Badge>
          </h2>
          <p className={styles.muted} data-example="ranking">
            {t("recommendations.exampleNotice")}
          </p>
          <Link
            to={cropPath(featured.id)}
            className={styles.cardLink}
            aria-labelledby="featured-label featured-name"
          >
            <Card variant="featured" className={styles.featured}>
              <div className={styles.featuredText}>
                <span id="featured-label" className={styles.eyebrow}>
                  {t("recommendations.bestCrop")}
                </span>
                <span id="featured-name" className={styles.featuredName}>
                  {featured.name}
                </span>
                <span className={styles.muted}>{featured.suitability}</span>
              </div>
              <PhotoFrame
                slot="thumbnail"
                {...photo(
                  cropIllustrations[featured.id],
                  photoLabel(featured.name),
                )}
                className={styles.featuredPhoto}
              />
            </Card>
          </Link>

          <section className={styles.section} aria-labelledby="other-options">
            <h3 id="other-options" className={styles.sectionTitle}>
              {t("recommendations.otherOptions")}
            </h3>
            <ul className={styles.options}>
              {otherOptions.map((option) => (
                <li key={option.id}>
                  <Link
                    to={cropPath(option.id)}
                    className={styles.cardLink}
                    aria-labelledby={`option-${option.id}-name option-${option.id}-match`}
                  >
                    <Card className={styles.option}>
                      <PhotoFrame
                        slot="thumbnail"
                        {...photo(
                          cropIllustrations[option.id],
                          photoLabel(option.name),
                        )}
                      />
                      <span
                        id={`option-${option.id}-name`}
                        className={styles.optionName}
                      >
                        {option.name}
                      </span>
                      <span id={`option-${option.id}-match`}>
                        <Badge>{`${option.matchPercent}%`}</Badge>
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="rotation-plan">
            <h3 id="rotation-plan" className={styles.sectionTitle}>
              <span className={styles.cycleIcon}>
                <Icon icon={RefreshCw} />
              </span>
              {t("recommendations.rotationPlan")}
            </h3>
            <Card>
              <ol className={styles.steps} aria-labelledby="rotation-plan">
                {rotationPlan.map((step) => (
                  <li key={step.year}>
                    <Link to={cropPath(step.cropId)} className={styles.step}>
                      <span className={styles.stepNumber} aria-hidden="true">
                        {step.year}
                      </span>
                      <span className={styles.stepText}>
                        <span className={styles.muted}>
                          {t("recommendations.year", { year: step.year })}
                        </span>{" "}
                        <span className={styles.stepCrop}>{step.cropName}</span>
                      </span>
                      <span className={styles.chevron}>
                        <Icon icon={StepChevron} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        </section>

        {/* No further destination exists yet: "Learn more" opens the featured crop. */}
        <Button to={cropPath(featured.id)} withArrow>
          {t("recommendations.learnMore")}
        </Button>
      </div>
    </Screen>
  );
}
