import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Languages,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Sprout,
  UserRound,
} from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

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
import { useSession } from "../state/session";
import styles from "./Profile.module.css";

interface RowContentProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

interface SettingRowProps
  extends
    RowContentProps,
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "className" | "type" | "value"
    > {}

/**
 * design.md §7.9 setting row: the §2 icon-labeled fact-row pattern (icon circle ·
 * label · value) made tappable, with a trailing chevron pointing forward in the reading
 * direction (right in French/English, left in Arabic, §9a). Settings are not soil/water/crop
 * facts, so the icon uses the neutral --green-700 accent (§2).
 */
function RowContent({ icon, label, value }: RowContentProps) {
  const Chevron = useDirection() === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <>
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
    </>
  );
}

function SettingRow({ icon, label, value, ...button }: SettingRowProps) {
  return (
    <button type="button" className={styles.row} {...button}>
      <RowContent icon={icon} label={label} value={value} />
    </button>
  );
}

/** The same row as a real link (§9: navigation is an <a href>, not a button). */
function LinkRow({ to, ...content }: RowContentProps & { to: string }) {
  return (
    <Link to={to} className={styles.row}>
      <RowContent {...content} />
    </Link>
  );
}

/**
 * Route "/profile" · design.md §7.9 Profile / Settings: profile summary card (name, location,
 * email, phone), a short list of tappable setting rows, a parcels summary row linking to Farm,
 * then a secondary "sign out" action. Root header + tab bar (Profile active).
 *
 * - Language: the real i18n language (same one as the Header switcher); tapping cycles AR → FR
 *   → EN, so both controls always agree.
 * - Notifications: local on/off state only, never persisted.
 * - Units: metric is the only option; tapping only says more are coming.
 * - Parcels: how many parcels have been diagnosed. The only parcel source in the app is the pick
 *   on Home, so the count follows the session (0 before a pick, 1 after) instead of a fixed
 *   fixture number that could contradict Farm's "no parcel picked" state.
 * - Sign out: no auth exists; like Cover's "Sign in", it is a link back to the Cover screen.
 */
export function Profile() {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState(
    profileData.notificationsEnabled,
  );
  const [unitsNotice, setUnitsNotice] = useState(false);
  const { parcelPicked } = useSession();
  const parcelsDiagnosed = parcelPicked ? 1 : 0;

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
            {/* Email and phone are LTR even inside Arabic text: isolate them so the "+" and
                the "@" never get reordered (§9a). */}
            <span className={styles.muted}>
              <Icon icon={Mail} />
              <bdi dir="ltr">{profileData.email}</bdi>
            </span>
            <span className={styles.muted}>
              <Icon icon={Phone} />
              <bdi dir="ltr">{profileData.phone}</bdi>
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

        <section className={styles.section} aria-labelledby="profile-parcels">
          <h2 id="profile-parcels" className={styles.sectionTitle}>
            {t("profile.parcels")}
          </h2>
          <Card>
            <LinkRow
              to={PATHS.farm}
              icon={Sprout}
              label={t("profile.parcelsDiagnosed")}
              value={String(parcelsDiagnosed)}
            />
          </Card>
        </section>

        {/* No auth flow yet: like Cover's "Sign in", this only leads back to the Cover screen. */}
        <Button variant="secondary" to={PATHS.cover}>
          {t("profile.signOut")}
        </Button>
      </div>
    </Screen>
  );
}
