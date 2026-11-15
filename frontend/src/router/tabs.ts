import { ChartColumn, CloudSun, House, Sprout, User } from "lucide-react";

import type { TabItem } from "../components/TabBar";
import { PATHS } from "./paths";

/** A tab destination; its label is a translation key (design.md §9a), resolved by AppTabBar. */
export interface AppTab extends Omit<TabItem, "label"> {
  labelKey:
    | "tabs.home"
    | "tabs.farm"
    | "tabs.insights"
    | "tabs.weather"
    | "tabs.profile";
}

/**
 * The 5 bottom-tab destinations of design.md §6, in order: Home · Farm · Insights · Weather ·
 * Profile. Tab → route mapping per design.md §6 "Tab-to-route mapping": Home → /home,
 * Farm → /farm, Insights → /overview, Weather → /weather, Profile → /profile. Every tab has
 * its own icon. (A tab without `to` would render disabled; none is left.)
 */
export const TAB_ITEMS: readonly AppTab[] = [
  { id: "home", labelKey: "tabs.home", icon: House, to: PATHS.home },
  { id: "farm", labelKey: "tabs.farm", icon: Sprout, to: PATHS.farm },
  {
    id: "insights",
    labelKey: "tabs.insights",
    icon: ChartColumn,
    to: PATHS.overview,
  },
  {
    id: "weather",
    labelKey: "tabs.weather",
    icon: CloudSun,
    to: PATHS.weather,
  },
  { id: "profile", labelKey: "tabs.profile", icon: User, to: PATHS.profile },
];

/** Translation key of the tab bar's <nav> accessible name. */
export const TAB_BAR_LABEL_KEY = "tabs.navLabel";
