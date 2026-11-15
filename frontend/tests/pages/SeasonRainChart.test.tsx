import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import i18n from "../../src/i18n";
import { SeasonRainChart } from "../../src/pages/overview/SeasonRainChart";
import type { ZoneCovered } from "../../src/types/seasons";
import { fixtures } from "../fakeBackend";
import { inLanguage } from "../utils";

/** Real C057 answer: 10 seasons 2016…2025 (oldest first), normal 458.6 mm, 1996–2025. */
const zone = fixtures.zoneC057 as ZoneCovered;

const renderChart = () =>
  render(
    <SeasonRainChart
      seasons={zone.history}
      normalMm={zone.normals.rainMm}
      reference={zone.reference}
    />,
  );

const norm = (s: string | null | undefined) =>
  (s ?? "").replace(/\u00a0/g, " ");

/** Percent from an inline style like "inline-size: 44.7537%;". */
const percent = (el: Element | null, property: string) =>
  Number(
    new RegExp(`${property}:\\s*([\\d.]+)%`).exec(
      el?.getAttribute("style") ?? "",
    )?.[1],
  );

describe("SeasonRainChart: horizontal bars (design.md §6)", () => {
  inLanguage("fr");

  it("one row per season, oldest at the top, with the FULL season label", () => {
    renderChart();
    const list = screen.getByRole("list", {
      name: "Pluie de chaque saison (mm)",
    });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(10);
    expect(rows.map((r) => r.querySelector("span")?.textContent)).toEqual([
      "2015–2016",
      "2016–2017",
      "2017–2018",
      "2018–2019",
      "2019–2020",
      "2020–2021",
      "2021–2022",
      "2022–2023",
      "2023–2024",
      "2024–2025",
    ]);
  });

  it("every value is written next to its bar, in mm, from the API", () => {
    renderChart();
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((r) => norm(r.lastElementChild?.textContent))).toEqual(
      zone.history.map((s) => `${Math.round(s.rainMm)} mm`),
    );
    expect(norm(rows[0].lastElementChild?.textContent)).toBe("230 mm");
  });

  it("each row has a text alternative: season, mm and the normal", () => {
    renderChart();
    const labels = screen
      .getAllByRole("listitem")
      .map((r) => norm(r.getAttribute("aria-label")));
    expect(labels[0]).toBe("2015–2016 : 229,9 mm (normale 458,6 mm)");
    expect(labels[9]).toBe("2024–2025 : 370,6 mm (normale 458,6 mm)");
  });

  it("one shared scale: bar length proportional to rain, the wettest season fills the column", () => {
    const { container } = renderChart();
    const bars = [...container.querySelectorAll("[data-season]")].map((r) =>
      percent(r.querySelector("span > span"), "inline-size"),
    );
    const max = Math.max(...zone.history.map((s) => s.rainMm));
    zone.history.forEach((s, i) => {
      expect(bars[i]).toBeCloseTo((s.rainMm / max) * 100, 2);
    });
    expect(Math.max(...bars)).toBeCloseTo(100, 5); // 2017–2018, 513.7 mm
  });

  it("the normal: ONE vertical dashed line across all rows, at its place on the same scale, value in the legend", () => {
    const { container } = renderChart();
    const lines = container.querySelectorAll('[data-point="normal"]');
    expect(lines).toHaveLength(1);
    const max = Math.max(...zone.history.map((s) => s.rainMm));
    expect(percent(lines[0], "inset-inline-start")).toBeCloseTo(
      (458.6 / max) * 100,
      2,
    );
    expect(norm(screen.getByText(/^Normale 1996–2025/).textContent)).toBe(
      "Normale 1996–2025 : 458,6 mm, trait pointillé",
    );
    expect(
      screen.getByText("Pluie de la saison (mm), barres"),
    ).toBeInTheDocument();
  });

  it("the latest season (2024–2025) is marked, not by color alone", () => {
    const { container } = renderChart();
    const latest = container.querySelectorAll('[data-latest="true"]');
    expect(latest).toHaveLength(1);
    expect(latest[0]).toHaveAttribute("data-season", "2025");
    // Its own class (bold label + value in the stylesheet below), on the last row only.
    const rows = container.querySelectorAll("li");
    expect(rows[9].className).not.toBe(rows[0].className);
  });
});

describe("SeasonRainChart: RTL and the 360 px layout rules", () => {
  const css = readFileSync(
    join(process.cwd(), "src/pages/overview/SeasonRainChart.module.css"),
    "utf8",
  );

  it("Arabic: same rows and values, Western digits, the page is RTL", async () => {
    await i18n.changeLanguage("ar");
    renderChart();
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    const list = screen.getByRole("list", { name: "أمطار كل موسم (مم)" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(10);
    expect(rows[0].getAttribute("aria-label")).toBe(
      "2015–2016: 229,9 مم (المعدل العادي 458,6 مم)",
    );
    expect(list.textContent).not.toMatch(/[٠-٩۰-۹]/);
  });

  it("bars grow from the inline start (right in Arabic): logical properties only, never left/right", () => {
    const { container } = renderChart();
    for (const el of container.querySelectorAll("[style]")) {
      expect(el.getAttribute("style")).not.toMatch(
        /\b(left|right|width|margin-left|margin-right)\s*:/,
      );
    }
    expect(css).not.toMatch(
      /(^|[\s;{])(left|right|width|height|margin-left|margin-right|padding-left|padding-right|border-left|border-right)\s*:/m,
    );
    expect(css).toMatch(/border-inline-start:/);
  });

  it("fits a 360 px phone: the bar column shrinks, labels never wrap, captions stay at the 13 px size", () => {
    expect(css).toMatch(
      /grid-template-columns:\s*max-content minmax\(0, 1fr\) max-content/,
    );
    expect(css).toMatch(/white-space:\s*nowrap/);
    // Labels, values and legend use the factual caption token (13 px, design.md §3).
    expect(
      css.match(/font-size:\s*var\(--font-size-caption-factual\)/g),
    ).toHaveLength(2);
    expect(css).not.toMatch(/--font-size-caption\)/); // never the 11 px decorative size
  });
});
