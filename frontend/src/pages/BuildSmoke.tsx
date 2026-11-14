import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Header } from "../components/Header";
import { PhotoFrame } from "../components/PhotoFrame";
import { ProgressBar } from "../components/ProgressBar";
import { Screen } from "../components/Screen";
import styles from "./placeholder/placeholder.module.css";

/**
 * Route "/__smoke": NOT a product screen. Proves the build pipeline works (bundling, CSS
 * modules, tokens, fonts, icons) by rendering each shared component once with neutral
 * sample props. Delete or hide once real pages exist.
 */
export function BuildSmoke() {
  return (
    <Screen header={<Header title="Build smoke test" />}>
      <div className={styles.stack}>
        <p className={styles.notice}>Build mode: {import.meta.env.MODE}</p>
        <Button withArrow>Primary sample</Button>
        <Button variant="outline">Outline sample</Button>
        <Button variant="secondary">Secondary sample</Button>
        <Card>
          Standard card sample <Badge>Sample</Badge>
        </Card>
        <Card variant="featured">Featured card sample</Card>
        <ProgressBar label="Progress sample" value={60} />
        <div className={styles.row}>
          <PhotoFrame slot="thumbnail" placeholderLabel="Photo: sample" />
          <PhotoFrame slot="farm" placeholderLabel="Photo: sample" />
        </div>
      </div>
    </Screen>
  );
}
