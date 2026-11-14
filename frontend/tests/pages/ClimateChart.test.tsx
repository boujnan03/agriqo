import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { overviewData } from "../../src/mocks/overview";
import { ClimateChart } from "../../src/pages/overview/ClimateChart";

describe("ClimateChart", () => {
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
});
