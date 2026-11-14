import { Sprout } from "lucide-react";

import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { PhotoFrame } from "../components/PhotoFrame";
import { PATHS } from "../router/paths";
import styles from "./Cover.module.css";

/**
 * Route "/" · design.md §7.1 Cover (Welcome/onboarding): full-bleed photo (no radius, §6
 * bottom gradient), logo + title + tagline, primary button + secondary link near the bottom.
 * No header, no tab bar. The photo is a §8 placeholder until real photography exists.
 */
export function Cover() {
  return (
    <main className={styles.cover}>
      <PhotoFrame
        slot="cover"
        placeholderLabel="Photo : champ de blé"
        className={styles.photo}
      />
      <div className={styles.content}>
        <div className={styles.brand}>
          {/* Placeholder logo mark (§1: sprout over field rows) until the real logo exists. */}
          <span className={styles.logo}>
            <Icon icon={Sprout} size="data" />
          </span>
          <h1 className={styles.title}>FieldShift AI</h1>
          <p className={styles.tagline}>
            Rotation de cultures intelligente pour un avenir durable.
          </p>
        </div>
        <div className={styles.actions}>
          <Button to={PATHS.farm} withArrow>
            Commencer
          </Button>
          {/* No auth flow yet: "Se connecter" stays on the Cover screen. */}
          <Button variant="secondary" onPhoto to={PATHS.cover}>
            Se connecter
          </Button>
        </div>
      </div>
    </main>
  );
}
