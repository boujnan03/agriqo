import { screen, within } from "@testing-library/react";
import { Bell, House } from "lucide-react";
import { describe, expect, it } from "vitest";

import { TabBar } from "../../src/components/TabBar";
import { AppTabBar } from "../../src/router/AppTabBar";
import { inLanguage, renderWithRouter, tabBarLabel } from "../utils";

describe("TabBar (as filled by AppTabBar)", () => {
  // design.md names the tabs in English: assert them in English.
  inLanguage("en");

  it("shows the 5 design.md destinations, in order", () => {
    renderWithRouter(<AppTabBar />, "/overview");
    const nav = screen.getByRole("navigation", { name: tabBarLabel() });
    const labels = within(nav)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(labels).toEqual(["Home", "Farm", "Insights", "Weather", "Profile"]);
  });

  it("marks the tab of the current route as active", () => {
    renderWithRouter(<AppTabBar />, "/farm");
    expect(screen.getByRole("link", { name: "Farm" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    for (const name of ["Home", "Insights", "Weather", "Profile"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute(
        "aria-current",
      );
    }
  });

  it("all 5 destinations have a page: every tab is an enabled link to its route", () => {
    renderWithRouter(<AppTabBar />, "/overview");
    const nav = screen.getByRole("navigation", { name: tabBarLabel() });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/home", "/farm", "/overview", "/weather", "/profile"]);
    expect(within(nav).queryByRole("button")).not.toBeInTheDocument();
  });

  it("the shared TabBar still renders a destination without a route as disabled", () => {
    renderWithRouter(
      <TabBar
        ariaLabel="Sample tabs"
        items={[
          { id: "a", label: "Sample page", icon: House, to: "/a" },
          { id: "b", label: "Sample soon", icon: Bell },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Sample soon" })).toBeDisabled();
  });
});
