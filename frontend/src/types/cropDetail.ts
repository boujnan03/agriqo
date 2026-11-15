import type { CropId } from "./crop";

/**
 * A qualitative level (water need, expected yield), shown through `crops.level.<level>` in the
 * translation files — never as a French string in the data.
 */
export type CropLevel =
  "low" | "low_medium" | "medium" | "medium_high" | "high";

/** A month range, 1 = January … 12 = December; may wrap the year (Nov → Mar). */
export interface MonthRange {
  from: number;
  to: number;
}

/**
 * Data behind one crop's "Détails" screen (design.md §7.5): language-neutral values only. The
 * crop's name, description and "why this choice" text live in the translation files under
 * `crops.<id>.*`, so every UI language shows its own words.
 */
export interface CropDetail {
  /** Shows the "Recommandé" badge on the banner. */
  recommended: boolean;
  waterNeed: CropLevel;
  /** Best sowing/growing window, formatted per language (e.g. "nov. – mars"). */
  bestSeason: MonthRange;
  expectedYield: CropLevel;
}

/** One entry per known crop: the type system guarantees no crop is missing. */
export type CropDetailsById = Record<CropId, CropDetail>;
