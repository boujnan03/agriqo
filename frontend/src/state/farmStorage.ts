import { WATER_REGIMES, type WaterRegime } from "../types/seasons";

/** localStorage key of the farmer's own settings (design.md §7.3; spec §7.2). */
export const FARM_STORAGE_KEY = "agriqo.farm";

export const DEFAULT_WATER: WaterRegime = "pluvial";

const isWater = (value: unknown): value is WaterRegime =>
  WATER_REGIMES.includes(value as WaterRegime);

/**
 * The stored water regime, or the default. Storage can be missing, blocked (private mode) or
 * hold anything: every failure falls back to the default, the app never breaks over it.
 */
export function readStoredWater(): WaterRegime {
  try {
    const raw = window.localStorage.getItem(FARM_STORAGE_KEY);
    const water = raw ? (JSON.parse(raw) as { water?: unknown }).water : null;
    return isWater(water) ? water : DEFAULT_WATER;
  } catch {
    return DEFAULT_WATER;
  }
}

/** Remember the water regime on this device; silently skipped if storage is unavailable. */
export function storeWater(water: WaterRegime): void {
  try {
    window.localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify({ water }));
  } catch {
    // No storage (blocked, full, private mode): the choice still holds for this session.
  }
}
