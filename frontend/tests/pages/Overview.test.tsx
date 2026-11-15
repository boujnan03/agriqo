import { screen, within } from "@testing-library/react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { overviewData } from "../../src/mocks/overview";
import { TAB_BAR_LABEL } from "../../src/router/tabs";
import type { OverviewData } from "../../src/types/overview";
import { renderRoute } from "../utils";

describe("Overview page (design.md §7.3)", () => {
  it("the mock fixture matches the OverviewData type", () => {
    // Type-level check: enforced by `npm run typecheck`.
    expectTypeOf(overviewData).toEqualTypeOf<OverviewData>();
  });

  it("shows the climate summary values", () => {
    renderRoute("/overview");
    expect(
      screen.getByRole("heading", { level: 1, name: "Aperçu de la ferme" }),
    ).toBeInTheDocument();
    expect(screen.getByText(overviewData.location)).toBeInTheDocument();
    expect(
      screen.getByText(`${overviewData.avgTemp} °C`, { exact: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${overviewData.totalRainfall} mm`),
    ).toBeInTheDocument();
  });

  it("shows soil moisture and health index as bars with their numbers", () => {
    renderRoute("/overview");
    const soil = screen.getByRole("progressbar", { name: "Humidité du sol" });
    expect(soil).toHaveAttribute(
      "aria-valuenow",
      String(overviewData.soilMoisturePercent),
    );
    expect(
      screen.getByText(`${overviewData.soilMoisturePercent}%`),
    ).toBeInTheDocument();

    const health = screen.getByRole("progressbar", { name: "Indice de santé" });
    expect(health).toHaveAttribute(
      "aria-valuenow",
      String(overviewData.healthIndex.percent),
    );
    expect(
      screen.getByText(
        `${overviewData.healthIndex.label} · ${overviewData.healthIndex.percent}%`,
      ),
    ).toBeInTheDocument();
  });

  it("'Voir mes recommandations' leads to the recommendations screen", () => {
    renderRoute("/overview");
    expect(
      screen.getByRole("link", { name: "Voir mes recommandations" }),
    ).toHaveAttribute("href", "/recommendations");
  });

  it("is a tab-bar root with its tab active", () => {
    renderRoute("/overview");
    const tabBar = screen.getByRole("navigation", { name: TAB_BAR_LABEL });
    // Tab mapping (design.md §6): /overview is the "Insights" tab.
    expect(
      within(tabBar).getByRole("link", { name: "Insights" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
