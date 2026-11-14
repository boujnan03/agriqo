import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { PATHS } from "../router/paths";
import styles from "./NotFound.module.css";

/**
 * Catch-all route (any unmatched path) · design.md §7.6 Error/Not found: centered one-line
 * plain-language message, one primary button back to the Cover screen. No header, no tab bar.
 */
export function NotFound() {
  return (
    <Screen>
      <div className={styles.body}>
        <h1 className={styles.message}>Page introuvable.</h1>
        <Button to={PATHS.cover}>Retour à l&apos;accueil</Button>
      </div>
    </Screen>
  );
}
