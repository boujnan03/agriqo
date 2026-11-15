import { screen, within } from "@testing-library/react";
import { Bell, House } from "lucide-react";
import { describe, expect, it } from "vitest";

import { TabBar } from "../../src/components/TabBar";
import { AppTabBar } from "../../src/router/AppTabBar";
import { inLanguage, renderWithRouter, tabBarLabel } from "../utils";

describe("TabBar (as filled by AppTabBar)", () => {
  // design.md names the tabs in English: assert them in English.
  inLanguage("en");

  it("shows the 4 design.md destinations, in order", () => {
    renderWithRouter(<AppTabBar />, "/overview");
    const nav = screen.getByRole("navigation", { name: tabBarLabel() });
    const labels = within(nav)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(labels).toEqual(["Home", "Insights", "Map", "Profile"]);
  });

  it("marks the tab of the current route as active", () => {
    renderWithRouter(<AppTabBar />, "/farm");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Insights" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("all 4 destinations have a page now: every tab is an enabled link", () => {
    renderWithRouter(<AppTabBar />, "/overview");
    const nav = screen.getByRole("navigation", { name: tabBarLabel() });
    expect(within(nav).getAllByRole("link")).toHaveLength(4);
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
