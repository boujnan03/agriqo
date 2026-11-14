/**
 * What the farmer tells us about their field ("Votre ferme" screen, design.md §7.2).
 * User-entered / non-NASA data: values are display strings in French, as shown in the UI.
 */
export interface FarmData {
  /** Place name shown on the map chip, e.g. "Béni Mellal". */
  location: string;
  /** Soil type, e.g. "Argileux". */
  soilType: string;
  /** Irrigation water availability, e.g. "Limitée". */
  waterAvailability: string;
  /** Crop currently in the field, e.g. "Blé". */
  currentCrop: string;
}
