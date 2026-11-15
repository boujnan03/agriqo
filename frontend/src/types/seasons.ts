/**
 * `GET /api/seasons/zone` (backend app/seasons/, spec docs/seasons/IMPLEMENTATION_SEASONS.md
 * §6.5): past season types of the NASA POWER cell around a point, from the offline AGRIQO v5
 * model. Field names follow the backend's camelCase JSON exactly.
 */

/** Stable season-type ids, driest to wettest. Never the model's cluster numbers. */
export type SeasonTypeId =
  "dry_hot" | "normal_cool" | "normal_hot" | "very_wet_cool";

export const SEASON_TYPES: readonly SeasonTypeId[] = [
  "dry_hot",
  "normal_cool",
  "normal_hot",
  "very_wet_cool",
];

/** ok: the point is in a covered cell; proche: a covered cell within 0.5°; hors_zone: none. */
export type CellStatus = "ok" | "proche" | "hors_zone";

/** Farmer-entered (not NASA data): rain-fed or irrigated. */
export type WaterRegime = "pluvial" | "irrigue";

export const WATER_REGIMES: readonly WaterRegime[] = ["pluvial", "irrigue"];

export interface NearestCell {
  id: string;
  lat: number;
  lon: number;
  /** Point → cell centre, plain degrees (3 decimals). Shown as "~N km" (× 111), never as data. */
  distanceDeg: number;
}

export interface ZoneCell extends NearestCell {
  region: string;
  /** False where spring heat is meaningless: the type name drops "hot"/"cool". */
  heatRelevant: boolean;
}

export interface Period {
  from: number;
  to: number;
}

/** The cell's normals over the reference period (rounded by the backend). */
export interface SeasonNormals {
  rainMm: number;
  rainAutumnMm: number;
  rainSpringMm: number;
  heatSpringDays: number;
  /** Root-zone wetness, 0–1. */
  gwetrootMean: number;
  tMeanC: number;
}

/** One season, labelled by its END year: 2025 = Oct 2024 → May 2025 (shown "2024–2025"). */
export interface SeasonEntry {
  season: number;
  type: SeasonTypeId;
  margin: number;
  /** Close to two types (margin < 0.15): said on screen. */
  borderline: boolean;
  rainMm: number;
  rainPctNormal: number;
  rainAutumnMm: number;
  rainSpringMm: number;
  /** Days above 30 °C, March–May. */
  heatSpringDays: number;
  gwetrootMean: number;
  tMeanC: number;
}

export interface CountWindow extends Period {
  total: number;
  byType: Record<SeasonTypeId, number>;
}

export type AdviceId =
  | "drought_tolerant"
  | "dry_autumn"
  | "hot_spring"
  | "dry_spring"
  | "last_season_dry"
  | "wet_frequent"
  | "field_shift";

export interface AdviceItem {
  id: AdviceId;
  variant: WaterRegime;
  crops: string[];
  needsValidation: boolean;
  /** Every number a text may show (keys depend on the rule, docs/seasons_rules.md). */
  evidence: Record<string, number>;
}

export interface ModelInfo {
  name: string;
  k: number;
  version: string;
  trainedAt: string;
  sklearnVersion: string;
}

interface ZoneCommon {
  query: { lat: number; lon: number; water: WaterRegime };
  nearestCell: NearestCell;
  maxDistanceDeg: number;
  model: ModelInfo;
  source: string;
}

export interface ZoneCovered extends ZoneCommon {
  status: "ok" | "proche";
  cell: ZoneCell;
  reference: Period;
  normals: SeasonNormals;
  lastSeason: SeasonEntry;
  /** The last 10 seasons, oldest first; `lastSeason` is its last element. */
  history: SeasonEntry[];
  counts: { recent: CountWindow; before: CountWindow; reference: CountWindow };
  advice: AdviceItem[];
}

export interface ZoneOutside extends ZoneCommon {
  status: "hors_zone";
  cell: null;
  reference: null;
  normals: null;
  lastSeason: null;
  history: [];
  counts: null;
  advice: [];
}

export type ZoneResponse = ZoneCovered | ZoneOutside;
