import type { CropId } from "./crop";

/**
 * Suitability level of the featured crop, shown through `crops.suitability.<level>` in the
 * translation files.
 */
export type Suitability = "high";

/**
 * The single best crop (design.md §6: the one featured card on the screen). Its name comes from
 * the translation files (`crops.<id>.name`), never from the data.
 */
export interface FeaturedRecommendation {
  id: CropId;
  suitability: Suitability;
}

/** Another good option, shown as a smaller card with its match percentage. */
export interface RecommendationOption {
  id: CropId;
  /** Match score, 0–100. */
  matchPercent: number;
}

/** One year of the proposed rotation. */
export interface RotationStep {
  /** 1-based year of the rotation. */
  year: number;
  cropId: CropId;
}

/**
 * Data behind the "Recommandations" screen (design.md §7.4): ids and numbers only, every word
 * is translated.
 */
export interface RecommendationsData {
  featured: FeaturedRecommendation;
  otherOptions: RecommendationOption[];
  rotationPlan: RotationStep[];
}
