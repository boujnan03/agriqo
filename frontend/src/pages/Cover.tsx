import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { illustrations, photo } from "../assets/images";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PhotoFrame } from "../components/PhotoFrame";
import { PATHS } from "../router/paths";
import { useSession } from "../state/session";
import { LoginForm } from "./cover/LoginForm";
import styles from "./Cover.module.css";

/**
 * Route "/" · design.md §7.1 Cover (Welcome/onboarding): full-bleed photo (no radius, §6
 * bottom gradient), tagline, then the login gate near the bottom. The gate's submit is the
 * screen's one primary button: it replaced the old "Get started" button + "Sign in" link, so
 * the only way in is through the demo sign-in. Success → /home.
 * The AGRIQO logo is part of the photo itself (in the sky), so no separate logo or name here.
 * No header, no tab bar, so the §9a language switcher sits on the photo's top end corner.
 */
export function Cover() {
  const { t } = useTranslation();
  const { signIn } = useSession();
  const navigate = useNavigate();

  return (
    <main className={styles.cover}>
      <PhotoFrame
        slot="cover"
        {...photo(illustrations.cover, t("cover.photo"))}
        className={styles.photo}
      />
      <div className={styles.content}>
        <div className={styles.brand}>
          <p className={styles.tagline}>{t("cover.tagline")}</p>
        </div>
        <LoginForm
          onSuccess={() => {
            signIn();
            void navigate(PATHS.home);
          }}
        />
      </div>
      <div className={styles.language}>
        <LanguageSwitcher onPhoto />
      </div>
    </main>
  );
}
