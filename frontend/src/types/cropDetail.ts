import type { CropId } from "./crop";

/** Data behind one crop's "Détails" screen (design.md §7.5). French display strings. */
export interface CropDetail {
  name: string;
  /** Shows the "Recommandé" badge on the banner. */
  recommended: boolean;
  /** One-line summary under the banner. */
  description: string;
  /** Water need, e.g. "Faible à moyen". */
  waterNeed: string;
  /** Best sowing/growing window, e.g. "Nov – Mar". */
  bestSeason: string;
  /** Expected yield level, e.g. "Élevé". */
  expectedYield: string;
  /** Plain-language reason for the recommendation ("Pourquoi ce choix ?" box). */
  whyThisChoice: string;
}

/** One entry per known crop: the type system guarantees no crop is missing. */
export type CropDetailsById = Record<CropId, CropDetail>;
