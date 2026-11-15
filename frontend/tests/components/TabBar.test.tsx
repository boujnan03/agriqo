import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

  it("renders a destination without a route as a disabled button", () => {
    renderWithRouter(<AppTabBar />, "/overview");
    expect(screen.getByRole("button", { name: "Profile" })).toBeDisabled();
  });
});
