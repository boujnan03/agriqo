import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { inLanguage, renderRoute, picked } from "../utils";

// The forecast API is down: the page must say so, not invent a forecast (design.md §6, §7.8).
vi.mock("../../src/mocks/weather", () => ({
  weatherData: {
    location: { name: "Béni Mellal", lat: 32.37, lon: -6.48 },
    forecast: { status: "indisponible", source: "Open-Meteo" },
  },
}));

describe("Weather page when the forecast is unavailable", () => {
  inLanguage("fr");

  it("shows 'Donnée indisponible' with its source, and no day cards or numbers", () => {
    const { container } = renderRoute("/weather", picked);
    const today = screen
      .getByRole("heading", { level: 2, name: "Aujourd'hui" })
      .closest("section") as HTMLElement;
    expect(today).toHaveAttribute("data-status", "indisponible");
    expect(screen.getByText("Donnée indisponible")).toBeInTheDocument();
    expect(screen.getByText("Données : Open-Meteo")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "7 prochains jours" }),
    ).not.toBeInTheDocument();
    expect(container.querySelector("main")?.textContent).not.toMatch(/\d/);
  });
});
