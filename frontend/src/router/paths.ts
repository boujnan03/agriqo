/** One route per screen template in design.md §7 (+ the build smoke page). */
export const PATHS = {
  cover: "/", // §7.1 Cover (Welcome/onboarding)
  farm: "/farm", // §7.2 Map/Data-entry ("Your Farm")
  overview: "/overview", // §7.3 Dashboard ("Farm Overview")
  recommendations: "/recommendations", // §7.4 Recommendation list
  crop: "/crop/:id", // §7.5 Detail (a single crop)
  map: "/map", // §7.7 Map / Data layers (the Map tab)
  smoke: "/__smoke", // build-pipeline smoke page, not a product screen
  notFound: "*", // §7.6 Error/Not found: catch-all for any unmatched path
} as const;

export const cropPath = (id: string): string =>
  `/crop/${encodeURIComponent(id)}`;
