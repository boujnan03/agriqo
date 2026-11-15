/**
 * The per-parcel diagnostic: the exact JSON shape of the backend's
 * `POST /api/parcel/diagnostic` (backend/app/models.py, docs/SPEC_Diagnostic_Parcelle.md). The
 * backend is the source of truth: these types follow it, never the other way round.
 *
 * Each block reports its own status (design.md §6 Data card):
 * - ok: real values. A value the source lacks is an explicit `null` (shown as missing, never 0).
 * - indisponible: the source failed / timed out / isn't configured (`error` says which); no
 *   values at all.
 * - pas_de_donnees: the source answered but has nothing here (water, city…); no values.
 */

export type DataStatus = "ok" | "indisponible" | "pas_de_donnees";

/** Fields every block carries, whatever its status. */
export interface BlockMeta {
  status: DataStatus;
  /** Who produced the values, e.g. "NASA POWER": shown on every card. */
  source: string;
  /** indisponible only: "timeout", "http_503", "missing_api_key", "network_error"… */
  error?: string;
  /** pas_de_donnees only: the backend's French explanation (the UI uses its own i18n text). */
  message?: string;
  /** The backend's French caveat (resolution, definitions); the UI uses its own i18n text. */
  note?: string;
}

/**
 * A block as received: its values exist only when status is "ok" (the backend omits them
 * otherwise). `Values` lists the block's own fields, each possibly null.
 */
export type Block<Values> =
  | (BlockMeta & { status: "ok" } & Values)
  | (BlockMeta & { status: "indisponible" | "pas_de_donnees" });

/** The `ok` variant of a block: what a Data card renders. */
export type OkBlock<B> = Extract<B, { status: "ok" }>;

/** USDA soil texture classes (backend app/soil_texture.py). */
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

/** Sol: ISRIC SoilGrids, topsoil 0–30 cm. */
export type SoilBlock = Block<{
  texture_class: TextureClass | null;
  clay_pct: number | null;
  sand_pct: number | null;
  silt_pct: number | null;
  ph: number | null;
  organic_carbon_g_kg: number | null;
  depth: string | null;
}>;

/** Climat: NASA POWER climatology (+ frost days over the last 12 months of daily data). */
export type ClimateBlock = Block<{
  temp_mean_c: number | null;
  /** Typical daily high, averaged over the 12 months (not a record). */
  temp_max_c: number | null;
  rain_mm_year: number | null;
  frost_days: number | null;
  /** e.g. "2001-2025". */
  climatology_period: string | null;
  frost_days_period: { start: string; end: string } | null;
}>;

/** Soil-moisture label, classified by the backend (thresholds live there, not in the UI). */
export type SoilMoistureLabel = "sec" | "moyen" | "humide";

/** Humidité: NASA POWER surface (GWETTOP) and root-zone (GWETROOT) soil wetness, 0–1. */
export type SoilMoistureBlock = Block<{
  gwettop: number | null;
  gwetroot: number | null;
  label: SoilMoistureLabel | null;
  /** ISO date of the value (POWER lags a few days behind today). */
  date: string | null;
}>;

/** Relief: OpenTopography (SRTM GL1). */
export type TerrainBlock = Block<{
  /** Metres above sea level. */
  altitude: number | null;
  /** Mean slope over ~500 m around the point, percent. */
  slope_pct: number | null;
}>;

export interface DiagnosticResponse {
  location: { lat: number; lon: number };
  soil: SoilBlock;
  climate: ClimateBlock;
  soil_moisture: SoilMoistureBlock;
  terrain: TerrainBlock;
}

/** The four diagnostic blocks, by response key. */
export type DiagnosticBlockKey = Exclude<keyof DiagnosticResponse, "location">;
