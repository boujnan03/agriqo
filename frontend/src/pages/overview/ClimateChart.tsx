import type { MonthlyClimate } from "../../types/overview";
import styles from "./ClimateChart.module.css";

export interface ClimateChartProps {
  monthly: readonly MonthlyClimate[];
}

/** Share of the plot height the highest value reaches (headroom so the top dot isn't clipped). */
const HEADROOM = 85;

/** Percent of the plot height for `value` on a 0..max scale. */
const scale = (value: number, max: number): number =>
  max > 0 ? (Math.max(value, 0) / max) * HEADROOM : 0;

/** Horizontal center of column `i` of `n`, in percent. */
const columnCenter = (i: number, n: number): number => ((i + 0.5) / n) * 100;

/**
 * Temperature (line, --green-900) and rainfall (bars, --green-700) by month. design.md has no
 * chart component, so this is the simplest token-only version: each series on its own 0..max
 * scale, exact values printed under each month (the graphic illustrates, the numbers inform,
 * as for §6 progress bars), and a text legend so color is never the only signal (§9).
 */
export function ClimateChart({ monthly }: ClimateChartProps) {
  const n = monthly.length;
  const maxTemp = Math.max(...monthly.map((m) => m.temp), 0);
  const maxRain = Math.max(...monthly.map((m) => m.rainfall), 0);

  const linePoints = monthly
    .map((m, i) => `${columnCenter(i, n)},${100 - scale(m.temp, maxTemp)}`)
    .join(" ");

  const summary = monthly
    .map((m) => `${m.month} : ${m.temp} °C, ${m.rainfall} mm`)
    .join(" ; ");

  return (
    <figure className={styles.chart}>
      <div
        className={styles.plot}
        role="img"
        aria-label={`Température et précipitations par mois. ${summary}.`}
      >
        {monthly.map((m) => (
          <div key={m.month} className={styles.column}>
            <div
              className={styles.bar}
              data-point="rainfall"
              style={{ height: `${scale(m.rainfall, maxRain)}%` }}
            />
          </div>
        ))}
        <svg
          className={styles.line}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <polyline points={linePoints} />
        </svg>
        {monthly.map((m, i) => (
          <span
            key={m.month}
            className={styles.dot}
            data-point="temp"
            style={{
              left: `${columnCenter(i, n)}%`,
              bottom: `${scale(m.temp, maxTemp)}%`,
            }}
          />
        ))}
      </div>

      <ol className={styles.labels} aria-hidden="true">
        {monthly.map((m) => (
          <li key={m.month} className={styles.label}>
            <span className={styles.month}>{m.month}</span>
            <span className={styles.value}>{m.temp}°</span>
            <span className={styles.value}>{m.rainfall}</span>
          </li>
        ))}
      </ol>

      <figcaption className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatchLine} aria-hidden="true" />
          Température (°C), ligne
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchBar} aria-hidden="true" />
          Précipitations (mm), barres
        </span>
      </figcaption>
    </figure>
  );
}
