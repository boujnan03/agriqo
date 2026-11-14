import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TabBar } from "../../src/components/TabBar";
import { TAB_BAR_LABEL, TAB_ITEMS } from "../../src/router/tabs";
import { renderWithRouter } from "../utils";

describe("TabBar", () => {
  it("shows the 4 design.md destinations, in order", () => {
    renderWithRouter(
      <TabBar items={TAB_ITEMS} ariaLabel={TAB_BAR_LABEL} />,
      "/overview",
    );
    const nav = screen.getByRole("navigation", { name: TAB_BAR_LABEL });
    const labels = within(nav)
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(labels).toEqual(["Home", "Insights", "Map", "Profile"]);
  });

  it("marks the tab of the current route as active", () => {
    renderWithRouter(
      <TabBar items={TAB_ITEMS} ariaLabel={TAB_BAR_LABEL} />,
      "/farm",
    );
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders a destination without a route as a disabled button", () => {
    renderWithRouter(
      <TabBar items={TAB_ITEMS} ariaLabel={TAB_BAR_LABEL} />,
      "/overview",
    );
    expect(screen.getByRole("button", { name: "Profile" })).toBeDisabled();
  });
});
