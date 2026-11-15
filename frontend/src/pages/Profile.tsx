import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Languages,
  MapPin,
  Ruler,
  UserRound,
} from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Screen } from "../components/Screen";
import { LANGUAGES, type Language } from "../i18n";
import { useDirection } from "../i18n/useDirection";
import { profileData } from "../mocks/profile";
import { AppTabBar } from "../router/AppTabBar";
import { PATHS } from "../router/paths";
import styles from "./Profile.module.css";

interface SettingRowProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "type"
> {
  icon: LucideIcon;
  label: string;
  value: string;
}

/**
 * design.md §7 template 8 setting row: the §2 icon-labeled fact-row pattern (icon circle ·
 * label · value) made tappable, with a trailing chevron pointing forward in the reading
 * direction (right in French/English, left in Arabic, §9a). Settings are not soil/water/crop
 * facts, so the icon uses the neutral --green-700 accent (§2).
 */
function SettingRow({ icon, label, value, ...button }: SettingRowProps) {
  const Chevron = useDirection() === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <button type="button" className={styles.row} {...button}>
      <span className={styles.rowIcon}>
        <Icon icon={icon} size="data" />
      </span>
      <span className={styles.rowLabel}>{label}</span>
      {/* Space so the accessible name reads "Language English", not "LanguageEnglish"
          (ignored visually: whitespace between flex items is not rendered). */}{" "}
      <span className={styles.rowValue}>{value}</span>
      <span className={styles.chevron} data-chevron>
        <Icon icon={Chevron} />
      </span>
    </button>
  );
}

/**
 * Route "/profile" · design.md §7 template 8 Profile / Settings: profile summary card, a short
 * list of tappable setting rows, then a secondary "sign out" action. Root header + tab bar
 * (Profile active).
 *
 * - Language: the real i18n language (same one as the Header switcher); tapping cycles AR → FR
 *   → EN, so both controls always agree.
 * - Notifications: local on/off state only, never persisted.
 * - Units: metric is the only option; tapping only says more are coming.
 * - Sign out: no auth exists; like Cover's "Sign in", it is a link back to the Cover screen.
 */
export function Profile() {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState(
    profileData.notificationsEnabled,
  );
  const [unitsNotice, setUnitsNotice] = useState(false);

  const cycleLanguage = () => {
    const current = LANGUAGES.indexOf(i18n.language as Language);
    void i18n.changeLanguage(LANGUAGES[(current + 1) % LANGUAGES.length]);
  };

  return (
    <Screen
      header={<Header title={t("profile.title")} />}
      tabBar={<AppTabBar />}
    >
      <div className={styles.stack}>
        <Card className={styles.summary}>
          <span className={styles.avatar}>
            <Icon icon={UserRound} size="data" />
          </span>
          <div className={styles.summaryText}>
            <h2 className={styles.name}>{profileData.name}</h2>
            <span className={styles.muted}>
              <Icon icon={MapPin} />
              {profileData.location}
            </span>
            <span className={styles.muted}>
              {t("profile.memberSince", { year: profileData.memberSince })}
            </span>
          </div>
        </Card>

        <section className={styles.section} aria-labelledby="profile-settings">
          <h2 id="profile-settings" className={styles.sectionTitle}>
            {t("profile.settings")}
          </h2>
          <Card>
            <ul className={styles.rows}>
              <li>
                <SettingRow
                  icon={Languages}
                  label={t("profile.language")}
                  value={t("profile.currentLanguage")}
                  onClick={cycleLanguage}
                />
              </li>
              <li>
                <SettingRow
                  icon={Bell}
                  label={t("profile.notifications")}
                  value={t(
                    notifications
                      ? "profile.notificationsOn"
                      : "profile.notificationsOff",
                  )}
                  role="switch"
                  aria-checked={notifications}
                  onClick={() => setNotifications((on) => !on)}
                />
              </li>
              <li>
                <SettingRow
                  icon={Ruler}
                  label={t("profile.units")}
                  value={t(`profile.unitValues.${profileData.units}`)}
                  onClick={() => setUnitsNotice(true)}
                />
              </li>
            </ul>
          </Card>
          <p className={styles.status} role="status">
            {unitsNotice ? t("profile.unitsSoon") : ""}
          </p>
        </section>

        {/* No auth flow yet: like Cover's "Sign in", this only leads back to the Cover screen. */}
        <Button variant="secondary" to={PATHS.cover}>
          {t("profile.signOut")}
        </Button>
      </div>
    </Screen>
  );
}
