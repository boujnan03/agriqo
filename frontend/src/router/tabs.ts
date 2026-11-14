import { ChartColumn, House, Map as MapIcon, User } from "lucide-react";

import type { TabItem } from "../components/TabBar";
import { PATHS } from "./paths";

/**
 * The 4 bottom-tab destinations of design.md §6, in order: Home · Insights · Map · Profile.
 * Tab → route mapping is a team decision (2026-11-14), not specified in design.md:
 *   Home → Dashboard, Insights → Recommendations, Map → Your Farm.
 * Profile has no screen template in design.md §7 yet, so it has no `to` and renders disabled.
 * Labels are design.md's names verbatim (English).
 */
export const TAB_ITEMS: readonly TabItem[] = [
  { id: "home", label: "Home", icon: House, to: PATHS.overview },
  {
    id: "insights",
    label: "Insights",
    icon: ChartColumn,
    to: PATHS.recommendations,
  },
  { id: "map", label: "Map", icon: MapIcon, to: PATHS.farm },
  { id: "profile", label: "Profile", icon: User },
];

export const TAB_BAR_LABEL = "Main navigation";
