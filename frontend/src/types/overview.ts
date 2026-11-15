/**
 * One month of climate data for Insights' monthly chart (pages/overview/ClimateChart).
 *
 * NOT FED YET: the backend fetches POWER's monthly climatology but does not return it in the
 * diagnostic response, so Insights shows the chart as "not available yet" instead of drawing
 * made-up months. The chart component is kept, ready for a real monthly endpoint.
 */
export interface MonthlyClimate {
  /** Short month label, e.g. "Fév". */
  month: string;
  /** Mean temperature, °C. */
  temp: number;
  /** Total rainfall, mm. */
  rainfall: number;
}
