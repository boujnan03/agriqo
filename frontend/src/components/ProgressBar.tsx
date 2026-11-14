import styles from "./ProgressBar.module.css";

export interface ProgressBarProps {
  /** What the bar measures. Shown as text and used as the accessible name. */
  label: string;
  value: number;
  /** Defaults to 100. */
  max?: number;
  /**
   * The numeric value shown next to the bar. design.md §6: the bar illustrates, it never
   * replaces the number. Defaults to the rounded percentage, e.g. "72%".
   */
  valueText?: string;
  /** Fill color: "primary" = --green-900, "secondary" = --green-700 (§6). */
  tone?: "primary" | "secondary";
}

/** design.md §6 Progress / data bar: --border track, green fill, always shown with its number. */
export function ProgressBar({
  label,
  value,
  max = 100,
  valueText,
  tone = "primary",
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (clamped / max) * 100 : 0;
  const shownValue = valueText ?? `${Math.round(percent)}%`;

  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{shownValue}</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={shownValue}
      >
        <div
          className={`${styles.fill} ${styles[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
