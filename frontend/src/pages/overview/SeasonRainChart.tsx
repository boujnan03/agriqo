import { useTranslation } from "react-i18next";

import { formatSeason } from "../../i18n/format";
import { useFormat } from "../../i18n/useFormat";
import type { SeasonEntry } from "../../types/seasons";
import styles from "./SeasonRainChart.module.css";

export interface SeasonRainChartProps {
  /** The last seasons, oldest first (the API's `history`). */
  seasons: readonly SeasonEntry[];
  /** The cell's normal rainfall (mm), drawn as one horizontal line. */
  normalMm: number;
}

/** Share of the plot height the highest value reaches (headroom for the top value). */
const HEADROOM = 85;

/** Percent of the plot height for `value` on a 0..max scale. */
const scale = (value: number, max: number): number =>
  max > 0 ? (Math.max(value, 0) / max) * HEADROOM : 0;

/**
 * Rainfall of each season (bars, --green-700) against the cell's normal (one horizontal line,
 * --green-900), design.md §6 "Season rain chart". Same method as the Data-card rule and the
 * former monthly chart: ONE scale shared by bars and line, every value printed under its bar
 * (the graphic illustrates, the numbers inform), and a text legend, so color is never the only
 * signal (§9). Bars are not colored by season type.
 *
 * RTL (§9a): columns are a grid, so seasons run right-to-left in Arabic on their own; the
 * normal line is horizontal and full-width, so it needs no mirroring.
 */
export function SeasonRainChart({ seasons, normalMm }: SeasonRainChartProps) {
  const { t } = useTranslation();
  const { num } = useFormat();
  const max = Math.max(normalMm, ...seasons.map((s) => s.rainMm), 0);

  const summary = seasons
    .map((s) =>
      t("seasons.chart.item", {
        season: formatSeason(s.season),
        value: num(s.rainMm),
      }),
    )
    .join(t("seasons.chart.separator"));

  return (
    <figure className={styles.chart}>
      <div
        className={styles.plot}
        role="img"
        aria-label={t("seasons.chart.ariaLabel", {
          summary,
          normal: num(normalMm),
        })}
      >
        {seasons.map((s) => (
          <div key={s.season} className={styles.column}>
            <div
              className={styles.bar}
              data-season={s.season}
              style={{ height: `${scale(s.rainMm, max)}%` }}
            />
          </div>
        ))}
        <div
          className={styles.normal}
          data-point="normal"
          style={{ bottom: `${scale(normalMm, max)}%` }}
        />
      </div>

      <ol className={styles.labels} aria-hidden="true">
        {seasons.map((s) => (
          <li key={s.season} className={styles.label}>
            <span className={styles.value}>{num(s.rainMm, 0)}</span>
            {/* Two lines: "2024–" / "2025", so ten seasons fit a phone's width. */}
            <span className={styles.season}>{s.season - 1}–</span>
            <span className={styles.season}>{s.season}</span>
          </li>
        ))}
      </ol>

      <figcaption className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatchBar} aria-hidden="true" />
          {t("seasons.chart.legendBars")}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchLine} aria-hidden="true" />
          {t("seasons.chart.legendNormal", { value: num(normalMm) })}
        </span>
      </figcaption>
    </figure>
  );
}
