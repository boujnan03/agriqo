import type { RecommendationsData } from "../types/recommendations";

/**
 * Mock recommendations for the "Recommandations" screen until the backend scoring exists.
 * Illustrative values only, NOT computed from NASA data (the page marks them "Exemple").
 * Ids and numbers only: crop names and the suitability text are in the translation files.
 */
export const recommendationsData: RecommendationsData = {
  featured: { id: "ble", suitability: "high" },
  otherOptions: [
    { id: "orge", matchPercent: 85 },
    { id: "legumineuses", matchPercent: 82 },
  ],
  rotationPlan: [
    { year: 1, cropId: "ble" },
    { year: 2, cropId: "legumineuses" },
    { year: 3, cropId: "orge" },
  ],
};
