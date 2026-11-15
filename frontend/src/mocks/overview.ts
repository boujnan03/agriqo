import type { OverviewData } from "../types/overview";

/**
 * Mock dashboard data for the "Aperçu de la ferme" screen until the backend (NASA POWER
 * pipeline) exists. Illustrative values only, NOT real NASA data. avgTemp and totalRainfall
 * are the mean (20.7 → 21) and sum (171) of `monthly`, so the summary matches the chart;
 * minTemp/maxTemp bracket that mean, and frostDays matches the Farm diagnostic fixture.
 * There is deliberately no health index value: no real source (NDVI) exists yet.
 */
export const overviewData: OverviewData = {
  location: "Béni Mellal",
  avgTemp: 21, // °C
  minTemp: 14, // °C, mean daily minimum
  maxTemp: 28, // °C, mean daily maximum
  totalRainfall: 171, // mm
  frostDays: 4,
  monthly: [
    { month: "Jan", temp: 14, rainfall: 42 },
    { month: "Fév", temp: 16, rainfall: 38 },
    { month: "Mar", temp: 19, rainfall: 35 },
    { month: "Avr", temp: 21, rainfall: 30 },
    { month: "Mai", temp: 25, rainfall: 18 },
    { month: "Juin", temp: 29, rainfall: 8 },
  ],
  soilMoisturePercent: 68,
};
