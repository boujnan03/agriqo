import type { MapData, MapLayer, MapLayerId } from "../types/map";

/** All of a layer's translation keys follow from its id. */
const layer = (id: MapLayerId, lastUpdated: string): MapLayer => ({
  id,
  labelKey: `map.layers.${id}`,
  unitKey: `map.units.${id}`,
  legendKey: `map.legends.${id}`,
  descriptionKey: `map.descriptions.${id}`,
  lastUpdated,
});

/**
 * Mock satellite layers for the "Map" screen until real imagery and the backend exist.
 * Illustrative only, NOT real NASA/satellite data: no layer values exist yet, just which
 * layers the page offers and when each was (notionally) last updated.
 */
export const mapData: MapData = {
  location: "Béni Mellal",
  layers: [
    layer("vegetation", "2026-11-13"),
    layer("soilMoisture", "2026-11-12"),
    layer("rainfall", "2026-11-14"),
  ],
  defaultLayerId: "vegetation",
};
