/**
 * Every image slot in the app, in one place. Each slot is one import: replacing an
 * illustration with real photography later is a one-line change here, nothing else moves.
 * Images are plain file URLs (Vite asset imports) rendered as <img src>, never inlined markup.
 */
import cropLegumineuses from "./illustrations/crop-legumineuses.svg";
import cropOrge from "./illustrations/crop-orge.svg";
import cropWheat from "./illustrations/crop-wheat.svg";
import coverField from "./illustrations/cover-field.jpg";
import farmMap from "./illustrations/farm-map.svg";
import logoFull from "./logo/logo-full.png";
import logoMark from "./logo/logo-mark.png";
import type { CropId } from "../types/crop";

// Not imported on purpose: map-layer-*.svg belonged to the retired Map / Data layers template
// (design.md §7 "Retired"). The files stay in illustrations/ in case they are wanted later.

/** AGRIQO logo: icon only (compact Header) and icon + wordmark (Cover). */
export const logo = { mark: logoMark, full: logoFull } as const;

/** Single-slot illustrations. */
export const illustrations = {
  cover: coverField, // Cover full-bleed photo
  farm: farmMap, // Home's map/picker banner (design.md §7.2)
} as const;

/** One illustration per crop: same file for thumbnails and the wide Detail banner. */
export const cropIllustrations: Record<CropId, string> = {
  ble: cropWheat,
  orge: cropOrge,
  legumineuses: cropLegumineuses,
};

/** What a PhotoFrame shows: an image (with alt text) or the design.md §8 labelled placeholder. */
export type PhotoSource =
  { src: string; alt: string } | { placeholderLabel: string };

/**
 * PhotoFrame content for a slot: the image when one exists, otherwise the §8 placeholder as a
 * fallback (e.g. a crop id with no illustration yet). `label` is the slot's translated
 * description: the image's alt text, or the placeholder's visible label.
 */
export const photo = (src: string | undefined, label: string): PhotoSource =>
  src ? { src, alt: label } : { placeholderLabel: label };
