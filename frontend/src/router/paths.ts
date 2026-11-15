/** One route per screen template in design.md §7 (+ the build smoke page). */
export const PATHS = {
  cover: "/", // §7.1 Cover (Welcome/onboarding)
  home: "/home", // §7.2 Home: parcel picker + light summary (the Home tab)
  farm: "/farm", // §7.3 Farm: the full 4-card diagnostic (the Farm tab)
  overview: "/overview", // §7.4 Insights dashboard (the Insights tab)
  recommendations: "/recommendations", // §7.5 Recommendation list
  crop: "/crop/:id", // §7.6 Detail (a single crop)
  weather: "/weather", // §7.8 Weather: 7-day forecast (the Weather tab)
  profile: "/profile", // §7.9 Profile / Settings (the Profile tab)
  smoke: "/__smoke", // build-pipeline smoke page, not a product screen
  notFound: "*", // §7.7 Error/Not found: catch-all for any unmatched path
} as const;

export const cropPath = (id: string): string =>
  `/crop/${encodeURIComponent(id)}`;
