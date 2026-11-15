import type { HomeSummary } from "../types/diagnostic";
import { farmDiagnostic } from "./farmDiagnostic";

/**
 * Mock data for Home's light summary (design.md §7.2): the picked location + 2 headline facts
 * (soil texture, annual rainfall). Trimmed from the Farm diagnostic fixture rather than typed
 * again, so Home and Farm can never show different values for the same parcel.
 */
export const homeSummary: HomeSummary = {
  location: farmDiagnostic.location,
  soil: farmDiagnostic.soil,
  climate: farmDiagnostic.climate,
};
