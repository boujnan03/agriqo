import { useTranslation } from "react-i18next";

import { TabBar } from "../components/TabBar";
import { TAB_BAR_LABEL_KEY, TAB_ITEMS } from "./tabs";

/** The app's tab bar: the shared TabBar component filled with the §6 destinations. */
export function AppTabBar() {
  const { t } = useTranslation();
  const items = TAB_ITEMS.map(({ labelKey, ...tab }) => ({
    ...tab,
    label: t(labelKey),
  }));
  return <TabBar items={items} ariaLabel={t(TAB_BAR_LABEL_KEY)} />;
}
