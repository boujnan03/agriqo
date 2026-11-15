/** One month of climate data on the "Aperçu de la ferme" chart. */
export interface MonthlyClimate {
  /** Short French month label, e.g. "Fév". */
  month: string;
  /** Mean temperature, °C. */
  temp: number;
  /** Total rainfall, mm. */
  rainfall: number;
}

/** Data behind the "Aperçu de la ferme" dashboard (design.md §7.4 Insights). */
export interface OverviewData {
  /** Place name, e.g. "Béni Mellal". */
  location: string;
  /** Mean temperature over the period, °C. */
  avgTemp: number;
  /** Mean daily minimum temperature over the period, °C. */
  minTemp: number;
  /** Mean daily maximum temperature over the period, °C. */
  maxTemp: number;
  /** Total rainfall over the period, mm. */
  totalRainfall: number;
  /** Days with frost over the period. */
  frostDays: number;
  monthly: MonthlyClimate[];
  /** Soil moisture, 0–100. */
  soilMoisturePercent: number;
  // No health index field: design.md §7.4 keeps it a placeholder until a real NDVI source
  // exists, so there is no value to carry (never a fabricated score).
}
