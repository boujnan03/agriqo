/** The satellite data layers of the Map page (design.md §7 template 7). */
export type MapLayerId = "vegetation" | "soilMoisture" | "rainfall";

/**
 * One data layer. Everything shown as text is a translation key (UI copy lives in
 * src/i18n/*.json, design.md §9a); only the date is data.
 */
export interface MapLayer {
  id: MapLayerId;
  /** Layer name, used by the segmented control and the placeholder label. */
  labelKey: `map.layers.${MapLayerId}`;
  /** Unit of the layer's values, e.g. NDVI, %, mm. */
  unitKey: `map.units.${MapLayerId}`;
  /** Legend: what the low and high ends of the color scale mean. */
  legendKey: `map.legends.${MapLayerId}`;
  /** One-line plain-language description of the layer. */
  descriptionKey: `map.descriptions.${MapLayerId}`;
  /** Date of the most recent data, ISO "YYYY-MM-DD"; formatted per active language. */
  lastUpdated: string;
}

/** Data behind the "Map" screen. */
export interface MapData {
  /** Place name, e.g. "Béni Mellal". */
  location: string;
  layers: MapLayer[];
  /** Layer selected when the page opens. */
  defaultLayerId: MapLayerId;
}
