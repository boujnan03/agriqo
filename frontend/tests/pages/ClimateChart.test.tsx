import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import i18n from "../../src/i18n";
import { ClimateChart } from "../../src/pages/overview/ClimateChart";
import type { MonthlyClimate } from "../../src/types/overview";
import { inLanguage } from "../utils";

/**
 * Chart-only test data. Illustrative values, NOT real data: the app never feeds these to a page
 * (the backend doesn't send monthly values yet, so Insights shows the chart as unavailable).
 */
const overviewData: { monthly: MonthlyClimate[] } = {
  monthly: [
    { month: "Jan", temp: 14, rainfall: 42 },
    { month: "Fév", temp: 16, rainfall: 38 },
    { month: "Mar", temp: 19, rainfall: 35 },
    { month: "Avr", temp: 21, rainfall: 30 },
    { month: "Mai", temp: 25, rainfall: 18 },
    { month: "Juin", temp: 29, rainfall: 8 },
  ],
};

describe("ClimateChart", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("renders one temperature point and one rainfall bar per month of the fixture", () => {
    const { container } = render(
      <ClimateChart monthly={overviewData.monthly} />,
    );
    const n = overviewData.monthly.length;

    expect(container.querySelectorAll('[data-point="temp"]')).toHaveLength(n);
    expect(container.querySelectorAll('[data-point="rainfall"]')).toHaveLength(
      n,
    );
    for (const m of overviewData.monthly) {
      expect(screen.getByText(m.month)).toBeInTheDocument();
    }
  });

  it("exposes every value to assistive tech and has a text legend", () => {
    render(<ClimateChart monthly={overviewData.monthly} />);
    const chart = screen.getByRole("img");
    for (const m of overviewData.monthly) {
      expect(chart.getAttribute("aria-label")).toContain(
        `${m.month} : ${m.temp} °C, ${m.rainfall} mm`,
      );
    }
    expect(screen.getByText("Température (°C), ligne")).toBeInTheDocument();
    expect(screen.getByText("Précipitations (mm), barres")).toBeInTheDocument();
  });

  it("mirrors the temperature line in RTL (an SVG ignores `dir`, design.md §9a)", async () => {
    const firstX = () =>
      Number(
        document
          .querySelector("polyline")
          ?.getAttribute("points")
          ?.split(" ")[0]
          .split(",")[0],
      );
    const { unmount } = render(<ClimateChart monthly={overviewData.monthly} />);
    const ltrX = firstX();
    unmount();

    await i18n.changeLanguage("ar");
    render(<ClimateChart monthly={overviewData.monthly} />);
    // January sits at the inline start: left in French, right in Arabic.
    expect(ltrX).toBeLessThan(50);
    expect(firstX()).toBeCloseTo(100 - ltrX);
  });
});
