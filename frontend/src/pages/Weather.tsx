import { useTranslation } from "react-i18next";

import { Header } from "../components/Header";
import { Screen } from "../components/Screen";
import { AppTabBar } from "../router/AppTabBar";
import { PlaceholderNotice } from "./placeholder/PlaceholderNotice";

/** Route "/weather" · design.md §7.8 Weather (the Weather tab). Scaffold: real content comes next. */
export function Weather() {
  const { t } = useTranslation();
  return (
    <Screen
      header={<Header title={t("weather.title")} />}
      tabBar={<AppTabBar />}
    >
      <PlaceholderNotice template="Weather" />
    </Screen>
  );
}
