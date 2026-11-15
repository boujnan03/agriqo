import { ChartColumn, House, Map as MapIcon, User } from "lucide-react";

import type { TabItem } from "../components/TabBar";
import { PATHS } from "./paths";

/**
 * The 4 bottom-tab destinations of design.md §6, in order: Home · Insights · Map · Profile.
 * Tab → route mapping per design.md §6 "Tab-to-route mapping": Home → /farm,
 * Insights → /overview. Map and Profile have no page yet, so they have no `to` and render disabled.
 * Labels are design.md's names verbatim (English).
 */
export const TAB_ITEMS: readonly TabItem[] = [
  { id: "home", label: "Home", icon: House, to: PATHS.farm },
  { id: "insights", label: "Insights", icon: ChartColumn, to: PATHS.overview },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "profile", label: "Profile", icon: User },
];

export const TAB_BAR_LABEL = "Main navigation";
