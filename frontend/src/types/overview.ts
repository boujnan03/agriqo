/** One month of climate data on the "Aperçu de la ferme" chart. */
export interface MonthlyClimate {
  /** Short French month label, e.g. "Fév". */
  month: string;
  /** Mean temperature, °C. */
  temp: number;
  /** Total rainfall, mm. */
  rainfall: number;
}

/** Data behind the "Aperçu de la ferme" dashboard (design.md §7.3). */
export interface OverviewData {
  /** Place name, e.g. "Béni Mellal". */
  location: string;
  /** Mean temperature over the period, °C. */
  avgTemp: number;
  /** Total rainfall over the period, mm. */
  totalRainfall: number;
  monthly: MonthlyClimate[];
  /** Soil moisture, 0–100. */
  soilMoisturePercent: number;
  /** Overall field health: a short French word + a 0–100 score. */
  healthIndex: { label: string; percent: number };
}
