import type { CropId } from "./crop";

/** The single best crop (design.md §6: the one featured card on the screen). */
export interface FeaturedRecommendation {
  id: CropId;
  name: string;
  /** Short plain-language suitability statement, in French. */
  suitability: string;
}

/** Another good option, shown as a smaller card with its match percentage. */
export interface RecommendationOption {
  id: CropId;
  name: string;
  /** Match score, 0–100. */
  matchPercent: number;
}

/** One year of the proposed rotation. */
export interface RotationStep {
  /** 1-based year of the rotation. */
  year: number;
  cropId: CropId;
  cropName: string;
}

/** Data behind the "Recommandations" screen (design.md §7.4). */
export interface RecommendationsData {
  featured: FeaturedRecommendation;
  otherOptions: RecommendationOption[];
  rotationPlan: RotationStep[];
}
