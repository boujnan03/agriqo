import { Sprout } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PhotoFrame } from "../components/PhotoFrame";
import { PATHS } from "../router/paths";
import styles from "./Cover.module.css";

/**
 * Route "/" · design.md §7.1 Cover (Welcome/onboarding): full-bleed photo (no radius, §6
 * bottom gradient), logo + title + tagline, primary button + secondary link near the bottom.
 * No header, no tab bar, so the §9a language switcher sits on the photo's top end corner.
 * The photo is a §8 placeholder until real photography exists.
 */
export function Cover() {
  const { t } = useTranslation();
  return (
    <main className={styles.cover}>
      <PhotoFrame
        slot="cover"
        placeholderLabel={t("cover.photo")}
        className={styles.photo}
      />
      <div className={styles.content}>
        <div className={styles.brand}>
          {/* Placeholder logo mark (§1: sprout over field rows) until the real logo exists. */}
          <span className={styles.logo}>
            <Icon icon={Sprout} size="data" />
          </span>
          <h1 className={styles.title}>{t("app.name")}</h1>
          <p className={styles.tagline}>{t("cover.tagline")}</p>
        </div>
        <div className={styles.actions}>
          <Button to={PATHS.farm} withArrow>
            {t("cover.start")}
          </Button>
          {/* No auth flow yet: "Sign in" stays on the Cover screen. */}
          <Button variant="secondary" onPhoto to={PATHS.cover}>
            {t("cover.signIn")}
          </Button>
        </div>
      </div>
      <div className={styles.language}>
        <LanguageSwitcher onPhoto />
      </div>
    </main>
  );
}
