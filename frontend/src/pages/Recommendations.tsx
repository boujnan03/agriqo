import { ChevronRight, RefreshCw } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { PhotoFrame } from "../components/PhotoFrame";
import { Screen } from "../components/Screen";
import { recommendationsData } from "../mocks/recommendations";
import { cropPath, PATHS } from "../router/paths";
import styles from "./Recommendations.module.css";

/** design.md §8 placeholder label for a crop photo, e.g. "Photo : blé". */
const photoLabel = (cropName: string): string =>
  `Photo : ${cropName.toLocaleLowerCase("fr")}`;

/**
 * Route "/recommendations" · design.md §7.4 Recommendation list: one featured card, a row of
 * smaller option cards (photo + name + %), a stepped rotation plan, one primary CTA.
 * Drill-in screen (team decision, overrides §7.4's tab bar): back-arrow header to the
 * dashboard, NO tab bar. Every card / step is a real link to its crop's detail page (§9).
 */
export function Recommendations() {
  const { featured, otherOptions, rotationPlan } = recommendationsData;

  return (
    <Screen
      header={
        <Header
          variant="drill-in"
          title="Recommandations"
          backTo={PATHS.overview}
          backLabel="Retour à l'aperçu de la ferme"
        />
      }
    >
      <div className={styles.stack}>
        <Link
          to={cropPath(featured.id)}
          className={styles.cardLink}
          aria-labelledby="featured-label featured-name"
        >
          <Card variant="featured" className={styles.featured}>
            <div className={styles.featuredText}>
              <span id="featured-label" className={styles.eyebrow}>
                Meilleure culture pour vous
              </span>
              <span id="featured-name" className={styles.featuredName}>
                {featured.name}
              </span>
              <span className={styles.muted}>{featured.suitability}</span>
            </div>
            <PhotoFrame
              slot="thumbnail"
              placeholderLabel={photoLabel(featured.name)}
              className={styles.featuredPhoto}
            />
          </Card>
        </Link>

        <section className={styles.section} aria-labelledby="other-options">
          <h2 id="other-options" className={styles.sectionTitle}>
            Autres bonnes options
          </h2>
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
                      placeholderLabel={photoLabel(option.name)}
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
          <h2 id="rotation-plan" className={styles.sectionTitle}>
            <span className={styles.cycleIcon}>
              <Icon icon={RefreshCw} />
            </span>
            Plan de rotation des cultures
          </h2>
          <Card>
            <ol className={styles.steps} aria-labelledby="rotation-plan">
              {rotationPlan.map((step) => (
                <li key={step.year}>
                  <Link to={cropPath(step.cropId)} className={styles.step}>
                    <span className={styles.stepNumber} aria-hidden="true">
                      {step.year}
                    </span>
                    <span className={styles.stepText}>
                      <span className={styles.muted}>Année {step.year}</span>{" "}
                      <span className={styles.stepCrop}>{step.cropName}</span>
                    </span>
                    <span className={styles.chevron}>
                      <Icon icon={ChevronRight} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        {/* No further destination exists yet: "En savoir plus" opens the featured crop. */}
        <Button to={cropPath(featured.id)} withArrow>
          En savoir plus
        </Button>
      </div>
    </Screen>
  );
}
