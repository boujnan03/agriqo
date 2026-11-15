import { CircleAlert } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { checkCredentials } from "../../auth/seedAccount";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import styles from "./LoginForm.module.css";

export interface LoginFormProps {
  /** Called once the seeded demo credentials are entered. */
  onSuccess: () => void;
}

/**
 * design.md §7.1 Cover login gate: username + password checked against the one seeded demo
 * account (src/auth/seedAccount.ts). A UX gate, not security: no backend, no hashing. Wrong
 * credentials show one plain inline message (announced via role="alert"; icon + text, never
 * color alone, §9). Sits in a standard card so labels stay readable over the photo.
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const { t } = useTranslation();
  const id = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [failed, setFailed] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (checkCredentials(username, password)) {
      setFailed(false);
      onSuccess();
    } else {
      setFailed(true);
    }
  };

  return (
    <Card className={styles.card}>
      <form
        className={styles.form}
        aria-label={t("cover.loginForm")}
        onSubmit={submit}
        noValidate
      >
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${id}-username`}>
            {t("cover.username")}
          </label>
          <input
            id={`${id}-username`}
            className={styles.input}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={failed || undefined}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${id}-password`}>
            {t("cover.password")}
          </label>
          <input
            id={`${id}-password`}
            className={styles.input}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={failed || undefined}
          />
        </div>
        {failed ? (
          <p className={styles.error} role="alert">
            <Icon icon={CircleAlert} />
            {t("cover.loginError")}
          </p>
        ) : null}
        <Button type="submit" withArrow>
          {t("cover.signIn")}
        </Button>
      </form>
    </Card>
  );
}
