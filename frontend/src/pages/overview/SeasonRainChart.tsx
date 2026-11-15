import { useTranslation } from "react-i18next";

import { formatSeason } from "../../i18n/format";
import { useFormat } from "../../i18n/useFormat";
import type { Period, SeasonEntry } from "../../types/seasons";
import styles from "./SeasonRainChart.module.css";

export interface SeasonRainChartProps {
  /** The last seasons, oldest first (the API's `history`). The last one is the latest. */
  seasons: readonly SeasonEntry[];
  /** The cell's normal rainfall (mm), drawn as one vertical dashed line across all rows. */
  normalMm: number;
  /** Reference period of the normal (the API's `reference`, e.g. 1996–2025). */
  reference: Period;
}

/** Percent of the bar column for `value` on a 0..max scale. */
const scale = (value: number, max: number): number =>
  max > 0 ? (Math.max(value, 0) / max) * 100 : 0;

/**
 * Rainfall of each season against the cell's normal, as a HORIZONTAL bar chart (design.md §6
 * "Season rain chart"): one row per season, oldest at the top — full season label, the bar
 * (one scale shared by every row), the value in mm right after it. The normal is one vertical
 * dashed line across all rows (its value in the legend). The latest season is bold, not just
 * differently colored. Every number comes from the API.
 *
 * Layout: a 3-column grid (season | bar | value); the list and each row are subgrids, so every
 * bar shares the same column (= the same scale), and the normal line is laid over that column.
 * RTL: columns follow the reading direction and bars grow from the inline start (logical CSS
 * only), so in Arabic the bars grow from the right with nothing mirrored by hand.
 *
 * Accessibility: the rows are a named list; each row's label reads "season: mm (normal mm)".
 */
export function SeasonRainChart({
  seasons,
  normalMm,
  reference,
}: SeasonRainChartProps) {
  const { t } = useTranslation();
  const { num } = useFormat();
  const max = Math.max(normalMm, ...seasons.map((s) => s.rainMm), 0);

  return (
    <figure className={styles.chart}>
      <div className={styles.plot}>
        <ol className={styles.rows} aria-label={t("seasons.chart.listLabel")}>
          {seasons.map((s, i) => {
            const latest = i === seasons.length - 1;
            return (
              <li
                key={s.season}
                className={
                  latest ? `${styles.row} ${styles.latest}` : styles.row
                }
                data-season={s.season}
                data-latest={latest ? "true" : undefined}
                aria-label={t("seasons.chart.row", {
                  season: formatSeason(s.season),
                  value: num(s.rainMm),
                  normal: num(normalMm),
                })}
              >
                <span className={styles.season} aria-hidden="true">
                  {formatSeason(s.season)}
                </span>
                <span className={styles.track} aria-hidden="true">
                  <span
                    className={styles.bar}
                    style={{ inlineSize: `${scale(s.rainMm, max)}%` }}
                  />
                </span>
                <span className={styles.value} aria-hidden="true">
                  {t("seasons.chart.value", { value: num(s.rainMm, 0) })}
                </span>
              </li>
            );
          })}
        </ol>
        {/* Laid over the bar column of every row: one continuous vertical line. */}
        <div className={styles.normalColumn} aria-hidden="true">
          <span
            className={styles.normal}
            data-point="normal"
            style={{ insetInlineStart: `${scale(normalMm, max)}%` }}
          />
        </div>
      </div>

      <figcaption className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatchBar} aria-hidden="true" />
          {t("seasons.chart.legendBars")}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchLine} aria-hidden="true" />
          {t("seasons.chart.legendNormal", {
            from: reference.from,
            to: reference.to,
            value: num(normalMm),
          })}
        </span>
      </figcaption>
    </figure>
  );
}
