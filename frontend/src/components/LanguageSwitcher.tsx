import { useTranslation } from "react-i18next";

import { LANGUAGES } from "../i18n";
import { Button } from "./Button";
import styles from "./LanguageSwitcher.module.css";

export interface LanguageSwitcherProps {
  /** White text, for when the switcher sits on a photo (Cover), like §6 secondary links. */
  onPhoto?: boolean;
}

/**
 * design.md §9a language switcher (AR · FR · EN). Built from the §6 secondary/text-link Button
 * (§4 touch targets); the active language gets the §6 badge-pill look (green-tint pill,
 * green-900 bold) and `aria-pressed`.
 */
export function LanguageSwitcher({ onPhoto = false }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  return (
    <div
      className={styles.switcher}
      role="group"
      aria-label={t("language.label")}
    >
      {LANGUAGES.map((language) => {
        const active = i18n.language === language;
        return (
          <Button
            key={language}
            variant="secondary"
            onPhoto={onPhoto}
            lang={language}
            aria-pressed={active}
            className={active ? styles.active : undefined}
            onClick={() => void i18n.changeLanguage(language)}
          >
            {t(`language.${language}`)}
          </Button>
        );
      })}
    </div>
  );
}
