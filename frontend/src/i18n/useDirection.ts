import { useTranslation } from "react-i18next";

export type Direction = "ltr" | "rtl";

/**
 * Reading direction of the active language. Layout never needs it (CSS logical properties
 * mirror on their own, design.md §9a); only things CSS cannot mirror use it: directional icons
 * (back chevron, forward arrows) and the climate chart's SVG line.
 */
export function useDirection(): Direction {
  const { i18n } = useTranslation();
  return i18n.dir(i18n.language);
}
