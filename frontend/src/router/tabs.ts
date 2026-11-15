import { ChartColumn, House, Map as MapIcon, User } from "lucide-react";

import type { TabItem } from "../components/TabBar";
import { PATHS } from "./paths";

/** A tab destination; its label is a translation key (design.md §9a), resolved by AppTabBar. */
export interface AppTab extends Omit<TabItem, "label"> {
  labelKey: "tabs.home" | "tabs.insights" | "tabs.map" | "tabs.profile";
}

/**
 * The 4 bottom-tab destinations of design.md §6, in order: Home · Insights · Map · Profile.
 * Tab → route mapping per design.md §6 "Tab-to-route mapping": Home → /farm,
 * Insights → /overview, Map → /map. Profile has no page yet, so it has no `to` and renders disabled.
 */
export const TAB_ITEMS: readonly AppTab[] = [
  { id: "home", labelKey: "tabs.home", icon: House, to: PATHS.farm },
  {
    id: "insights",
    labelKey: "tabs.insights",
    icon: ChartColumn,
    to: PATHS.overview,
  },
  { id: "map", labelKey: "tabs.map", icon: MapIcon, to: PATHS.map },
  { id: "profile", labelKey: "tabs.profile", icon: User },
];

/** Translation key of the tab bar's <nav> accessible name. */
export const TAB_BAR_LABEL_KEY = "tabs.navLabel";
