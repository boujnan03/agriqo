import type { OverviewData } from "../types/overview";

/**
 * Mock dashboard data for the "Aperçu de la ferme" screen until the backend (NASA POWER
 * pipeline) exists. Illustrative values only, NOT real NASA data. Note: avgTemp and
 * totalRainfall are given values, not computed from `monthly`.
 */
export const overviewData: OverviewData = {
  location: "Béni Mellal",
  avgTemp: 24, // °C
  totalRainfall: 280, // mm
  monthly: [
    { month: "Jan", temp: 14, rainfall: 42 },
    { month: "Fév", temp: 16, rainfall: 38 },
    { month: "Mar", temp: 19, rainfall: 35 },
    { month: "Avr", temp: 21, rainfall: 30 },
    { month: "Mai", temp: 25, rainfall: 18 },
    { month: "Juin", temp: 29, rainfall: 8 },
  ],
  soilMoisturePercent: 68,
  healthIndex: { label: "Bon", percent: 82 },
};
