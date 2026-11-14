import type { FarmData } from "../types/farm";

/**
 * Mock farm for the "Votre ferme" screen until the backend exists: a typical Tadla-plain
 * (Béni Mellal) wheat field. Illustrative values, NOT NASA data.
 */
export const farmData: FarmData = {
  location: "Béni Mellal",
  soilType: "Argileux",
  waterAvailability: "Limitée",
  currentCrop: "Blé",
};
