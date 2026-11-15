import { useTranslation } from "react-i18next";

import { Button } from "../components/Button";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { Screen } from "../components/Screen";
import { PATHS } from "../router/paths";
import styles from "./NotFound.module.css";

/**
 * Catch-all route (any unmatched path) · design.md §7.6 Error/Not found: centered one-line
 * plain-language message, one primary button back to the Cover screen. No header, no tab bar,
 * so the §9a language switcher sits in the top end corner.
 */
export function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen>
      <div className={styles.language}>
        <LanguageSwitcher />
      </div>
      <div className={styles.body}>
        <h1 className={styles.message}>{t("notFound.message")}</h1>
        <Button to={PATHS.cover}>{t("notFound.backHome")}</Button>
      </div>
    </Screen>
  );
}
