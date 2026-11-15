import type { FarmDiagnostic } from "../types/diagnostic";

/**
 * Mock diagnostic for one parcel in the Tadla plain near Béni Mellal, until the backend calls
 * the real sources. Illustrative values only (plausible for the area, NOT fetched from any
 * API): calcareous clay-loam topsoil, semi-arid climate, a little frost in winter.
 *
 * Relief is deliberately `indisponible` so the Data card's non-ok state is exercised on the
 * real page, not just supported in theory (design.md §6).
 */
export const farmDiagnostic: FarmDiagnostic = {
  location: { name: "Béni Mellal", lat: 32.37, lon: -6.48 },
  soil: {
    status: "ok",
    source: "ISRIC SoilGrids",
    data: { texture_class: "clay_loam", ph: 8.1, organic_carbon_g_kg: 8.6 },
  },
  climate: {
    status: "ok",
    source: "NASA POWER",
    data: {
      temp_mean_c: 18.9,
      temp_max_c: 26.4,
      rain_mm_year: 342,
      frost_days: 4,
    },
  },
  humidity: {
    status: "ok",
    source: "NASA POWER",
    data: { value_pct: 34, level: "moyen" },
  },
  relief: { status: "indisponible", source: "OpenTopography" },
};
