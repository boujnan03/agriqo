import { screen } from "@testing-library/react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { farmData } from "../../src/mocks/farm";
import { TAB_BAR_LABEL } from "../../src/router/tabs";
import type { FarmData } from "../../src/types/farm";
import { renderRoute } from "../utils";

describe("Farm page (design.md §7.2)", () => {
  it("the mock fixture matches the FarmData type", () => {
    // Type-level check: enforced by `npm run typecheck`.
    expectTypeOf(farmData).toEqualTypeOf<FarmData>();
  });

  it("renders the title, the map with the location chip and the three fact values", () => {
    renderRoute("/farm");
    expect(
      screen.getByRole("heading", { level: 1, name: "Votre ferme" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Carte : vue satellite de la parcelle" }),
    ).toBeInTheDocument();
    expect(screen.getByText(farmData.location)).toBeInTheDocument();
    expect(screen.getByText(farmData.soilType)).toBeInTheDocument();
    expect(screen.getByText(farmData.waterAvailability)).toBeInTheDocument();
    expect(screen.getByText(farmData.currentCrop)).toBeInTheDocument();
  });

  it("'Analyser ma ferme' leads to the dashboard", () => {
    renderRoute("/farm");
    expect(
      screen.getByRole("link", { name: "Analyser ma ferme" }),
    ).toHaveAttribute("href", "/overview");
  });

  it("is a tab-bar root: title-only header, tab bar with its tab active", () => {
    renderRoute("/farm");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /retour|back/i }),
    ).not.toBeInTheDocument();
    const tabBar = screen.getByRole("navigation", { name: TAB_BAR_LABEL });
    expect(tabBar).toBeInTheDocument();
    // Tab mapping (src/router/tabs.ts, team decision): /farm is the "Map" tab.
    expect(screen.getByRole("link", { name: "Map" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
