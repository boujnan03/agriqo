import type { RecommendationsData } from "../types/recommendations";

/**
 * Mock recommendations for the "Recommandations" screen until the backend scoring exists.
 * Illustrative values only, NOT computed from NASA data.
 */
export const recommendationsData: RecommendationsData = {
  featured: {
    id: "ble",
    name: "Blé",
    suitability: "Haute adéquation pour vos conditions",
  },
  otherOptions: [
    { id: "orge", name: "Orge", matchPercent: 85 },
    { id: "legumineuses", name: "Légumineuses", matchPercent: 82 },
  ],
  rotationPlan: [
    { year: 1, cropId: "ble", cropName: "Blé" },
    { year: 2, cropId: "legumineuses", cropName: "Légumineuses" },
    { year: 3, cropId: "orge", cropName: "Orge" },
  ],
};
