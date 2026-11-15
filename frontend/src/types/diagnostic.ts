/**
 * The per-parcel diagnostic behind Home's summary and Farm's 4 Data cards (design.md §6 Data
 * card, §7.2–7.3). Shaped after the backend response the real spec describes: one block per
 * data source, each carrying its own status. Field names inside a block (snake_case) follow the
 * API so the mock can later be swapped for the real response with no reshaping.
 */

/** Plain-language reason shown when a source answered but has nothing for this point. */
export type NoDataReason = "outsideCoverage" | "waterBody";

/**
 * One source's answer for the picked parcel, in the three states of design.md §6:
 * - ok: the real values
 * - indisponible: the source failed / timed out / is down (no values at all)
 * - pas_de_donnees: the source answered but has nothing for this location (+ why)
 * A missing value is a status, never a number standing in for it.
 */
export type SourcedData<T> =
  | { status: "ok"; source: string; data: T }
  | { status: "indisponible"; source: string }
  | { status: "pas_de_donnees"; source: string; reason: NoDataReason };

export type DataStatus = SourcedData<unknown>["status"];

/** USDA soil texture classes (the classification SoilGrids texture data is usually mapped to). */
export type TextureClass =
  | "clay"
  | "silty_clay"
  | "sandy_clay"
  | "clay_loam"
  | "silty_clay_loam"
  | "sandy_clay_loam"
  | "loam"
  | "silt_loam"
  | "sandy_loam"
  | "silt"
  | "loamy_sand"
  | "sand";

/** Sol: ISRIC SoilGrids, topsoil. */
export interface SoilData {
  texture_class: TextureClass;
  ph: number;
  organic_carbon_g_kg: number;
}

/** Climat: NASA POWER climatology for the parcel. */
export interface ClimateData {
  temp_mean_c: number;
  temp_max_c: number;
  rain_mm_year: number;
  frost_days: number;
}

/** Soil-moisture level as classified by the backend (thresholds live there, not in the UI). */
export type HumidityLevel = "sec" | "moyen" | "humide";

/** Humidité: NASA POWER surface soil wetness, current value + its level. */
export interface HumidityData {
  value_pct: number;
  level: HumidityLevel;
}

/** Relief: OpenTopography elevation model. */
export interface ReliefData {
  altitude_m: number;
  slope_pct: number;
}

export interface ParcelLocation {
  /** Place name shown to the farmer, e.g. "Béni Mellal". */
  name: string;
  lat: number;
  lon: number;
}

export interface FarmDiagnostic {
  location: ParcelLocation;
  soil: SourcedData<SoilData>;
  climate: SourcedData<ClimateData>;
  humidity: SourcedData<HumidityData>;
  relief: SourcedData<ReliefData>;
}

/** Home's light summary: the location + the 2 headline facts, taken from the same diagnostic. */
export interface HomeSummary {
  location: ParcelLocation;
  /** Headline fact 1: soil texture. */
  soil: SourcedData<Pick<SoilData, "texture_class">>;
  /** Headline fact 2: annual rainfall. */
  climate: SourcedData<Pick<ClimateData, "rain_mm_year">>;
}
