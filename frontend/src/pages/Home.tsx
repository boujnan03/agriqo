import { useTranslation } from "react-i18next";

import { Header } from "../components/Header";
import { Screen } from "../components/Screen";
import { AppTabBar } from "../router/AppTabBar";
import { PlaceholderNotice } from "./placeholder/PlaceholderNotice";

/** Route "/home" · design.md §7.2 Home (the Home tab). Scaffold: real content comes next. */
export function Home() {
  const { t } = useTranslation();
  return (
    <Screen header={<Header title={t("home.title")} />} tabBar={<AppTabBar />}>
      <PlaceholderNotice template="Home" />
    </Screen>
  );
}
