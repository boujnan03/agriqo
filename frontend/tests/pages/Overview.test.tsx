import { screen, within } from "@testing-library/react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { overviewData } from "../../src/mocks/overview";
import type { OverviewData } from "../../src/types/overview";
import { inLanguage, renderRoute, tabBarLabel } from "../utils";

describe("Overview / Insights page (design.md §7.4)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("the mock fixture matches the OverviewData type", () => {
    // Type-level check: enforced by `npm run typecheck`.
    expectTypeOf(overviewData).toEqualTypeOf<OverviewData>();
  });

  it("shows the climate summary: mean, min and max temperature + rainfall", () => {
    renderRoute("/overview");
    expect(
      screen.getByRole("heading", { level: 1, name: "Aperçu de la ferme" }),
    ).toBeInTheDocument();
    expect(screen.getByText(overviewData.location)).toBeInTheDocument();
    const summary = screen
      .getByRole("heading", { level: 2, name: "Résumé climatique" })
      .closest("section") as HTMLElement;
    const stats = Object.fromEntries(
      within(summary)
        .getAllByRole("term")
        .map((dt) => [
          dt.textContent,
          dt.nextElementSibling?.textContent?.replace(/\u00a0/g, " "),
        ]),
    );
    expect(stats).toEqual({
      "Température moyenne": `${overviewData.avgTemp} °C`,
      "Minimale moyenne": `${overviewData.minTemp} °C`,
      "Maximale moyenne": `${overviewData.maxTemp} °C`,
      "Précipitations totales": `${overviewData.totalRainfall} mm`,
    });
    expect(overviewData.minTemp).toBeLessThan(overviewData.avgTemp);
    expect(overviewData.maxTemp).toBeGreaterThan(overviewData.avgTemp);
  });

  it("shows frost days as its own stat", () => {
    renderRoute("/overview");
    const frost = screen.getByText("Jours de gel");
    expect(frost.nextElementSibling).toHaveTextContent(
      String(overviewData.frostDays),
    );
  });

  it("shows soil moisture as a bar with its number", () => {
    renderRoute("/overview");
    const soil = screen.getByRole("progressbar", { name: "Humidité du sol" });
    expect(soil).toHaveAttribute(
      "aria-valuenow",
      String(overviewData.soilMoisturePercent),
    );
    expect(
      screen.getByText(`${overviewData.soilMoisturePercent}%`),
    ).toBeInTheDocument();
  });

  it("Health Index is an explicit 'not yet available' placeholder, with no score at all", () => {
    renderRoute("/overview");
    const health = screen
      .getByRole("heading", { level: 2, name: "Indice de santé" })
      .closest("section") as HTMLElement;
    expect(
      within(health).getByText("Bientôt disponible (NDVI)"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("progressbar", { name: "Indice de santé" }),
    ).not.toBeInTheDocument();
    expect(health.textContent).not.toMatch(/\d|%/);
    expect(overviewData).not.toHaveProperty("healthIndex");
    expect(screen.getAllByRole("progressbar")).toHaveLength(1); // soil moisture only
  });

  it("'Voir mes recommandations' leads to the recommendations screen", () => {
    renderRoute("/overview");
    expect(
      screen.getByRole("link", { name: "Voir mes recommandations" }),
    ).toHaveAttribute("href", "/recommendations");
  });

  it("is a tab-bar root with its tab active", () => {
    renderRoute("/overview");
    const tabBar = screen.getByRole("navigation", { name: tabBarLabel() });
    // Tab mapping (design.md §6): /overview is the "Insights" tab ("Analyses" in French).
    expect(
      within(tabBar).getByRole("link", { name: "Analyses" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
