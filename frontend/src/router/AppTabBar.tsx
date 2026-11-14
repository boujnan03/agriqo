import { TabBar } from "../components/TabBar";
import { TAB_BAR_LABEL, TAB_ITEMS } from "./tabs";

/** The app's tab bar: the shared TabBar component filled with the §6 destinations. */
export function AppTabBar() {
  return <TabBar items={TAB_ITEMS} ariaLabel={TAB_BAR_LABEL} />;
}
