import type { CropId } from "../types/crop";
import type { CropDetail, CropDetailsById } from "../types/cropDetail";

/**
 * Mock crop details for the "Détails" screen, one per crop referenced by the Recommendations
 * fixture. Qualitative, illustrative values (FAO-style, need agronomic validation), NOT NASA data.
 * Language-neutral only: names, descriptions and "why" texts are in the translation files
 * (`crops.<id>.*`), levels in `crops.level.*`, months formatted per language.
 */
export const cropDetails: CropDetailsById = {
  ble: {
    recommended: true,
    waterNeed: "low_medium",
    bestSeason: { from: 11, to: 3 },
    expectedYield: "high",
  },
  orge: {
    recommended: false,
    waterNeed: "low",
    bestSeason: { from: 10, to: 2 },
    expectedYield: "medium_high",
  },
  legumineuses: {
    recommended: false,
    waterNeed: "medium",
    bestSeason: { from: 12, to: 4 },
    expectedYield: "medium",
  },
};

/** True when `id` (e.g. a raw route param) names a known crop. */
export const isCropId = (id: string): id is CropId =>
  Object.hasOwn(cropDetails, id);

/** The crop's details, or undefined for an unknown id. */
export const findCropDetail = (id: string): CropDetail | undefined =>
  isCropId(id) ? cropDetails[id] : undefined;
