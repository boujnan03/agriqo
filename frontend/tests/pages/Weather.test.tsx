import { screen, within } from "@testing-library/react";
import { describe, expect, expectTypeOf, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import { farmDiagnostic } from "../../src/mocks/farmDiagnostic";
import { weatherData } from "../../src/mocks/weather";
import type { WeatherData } from "../../src/types/weather";
import { inLanguage, renderRoute, tabBarLabel, picked } from "../utils";

const forecast =
  weatherData.forecast.status === "ok" ? weatherData.forecast.data : null;

/** The 7 day cards, as listitems of the "next 7 days" list. */
const dayCards = () =>
  within(
    screen.getByRole("list", { name: i18n.t("weather.next7") }),
  ).getAllByRole("listitem");

describe("Weather page (design.md §7.8)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("the mock fixture: WeatherData, 7 days for the picked parcel, a forecast source", () => {
    expectTypeOf(weatherData).toEqualTypeOf<WeatherData>();
    expect(weatherData.location).toBe(farmDiagnostic.location);
    expect(forecast?.days).toHaveLength(7);
    expect(weatherData.forecast.source).toBe("Open-Meteo");
    expect(weatherData.forecast.source).not.toMatch(/NASA|POWER/);
  });

  it("shows today's summary: icon, temperature, condition, rain chance, humidity, wind", () => {
    renderRoute("/weather", picked);
    expect(
      screen.getByRole("heading", { level: 1, name: "Météo" }),
    ).toBeInTheDocument();
    const today = screen
      .getByRole("heading", { level: 2, name: "Aujourd'hui" })
      .closest("section") as HTMLElement;
    expect(within(today).getByText("19 °C")).toBeInTheDocument();
    expect(
      within(today).getByText("Partiellement nuageux"),
    ).toBeInTheDocument();
    const facts = Object.fromEntries(
      within(today)
        .getAllByRole("term")
        .map((dt) => [
          dt.textContent,
          dt.nextElementSibling?.textContent?.replace(/\u00a0/g, " "),
        ]),
    );
    expect(facts).toEqual({
      "Risque de pluie": "10 %",
      "Humidité de l'air": "58 %",
      Vent: "12 km/h",
    });
  });

  it("names its forecast source visibly", () => {
    renderRoute("/weather", picked);
    expect(screen.getByText("Données : Open-Meteo")).toBeInTheDocument();
    expect(screen.queryByText(/NASA POWER/)).not.toBeInTheDocument();
  });

  it("shows 7 day cards in order: weekday, condition icon, distinct high°/low°", () => {
    renderRoute("/weather", picked);
    const cards = dayCards();
    expect(cards).toHaveLength(7);
    // 2026-11-15 is a Sunday.
    expect(cards.map((li) => li.querySelector("span")?.textContent)).toEqual([
      "dim.",
      "lun.",
      "mar.",
      "mer.",
      "jeu.",
      "ven.",
      "sam.",
    ]);
    expect(
      within(cards[0]).getByRole("img", { name: "Partiellement nuageux" }),
    ).toBeInTheDocument();
    expect(
      within(cards[5]).getByRole("img", { name: "Pluie" }),
    ).toBeInTheDocument();
    expect(cards[0]).toHaveTextContent("21°");
    expect(cards[0]).toHaveTextContent("9°");

    const pairs = cards.map((li) => li.textContent);
    expect(new Set(pairs).size).toBe(7);
    forecast?.days.forEach((day, i) => {
      expect(cards[i]).toHaveTextContent(`${day.temp_max_c}°`);
      expect(cards[i]).toHaveTextContent(`${day.temp_min_c}°`);
    });
  });

  it("is daily only: no hourly view, no metric tabs or switcher", () => {
    renderRoute("/weather", picked);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("before any pick: the empty state pointing back to Home, no forecast", () => {
    renderRoute("/weather");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Aucune parcelle choisie",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Choisir ma parcelle" }),
    ).toHaveAttribute("href", "/home");
    expect(screen.queryByText("Données : Open-Meteo")).not.toBeInTheDocument();
  });

  it("is a tab-bar root: title-only header, Weather tab active", () => {
    renderRoute("/weather");
    expect(within(screen.getByRole("banner")).queryByRole("link")).toBeNull();
    const tabBar = screen.getByRole("navigation", { name: tabBarLabel() });
    expect(within(tabBar).getByRole("link", { name: "Météo" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe.each(LANGUAGES)("Weather page in %s", (lng) => {
  inLanguage(lng);

  it("renders every string translated, 7 distinct weekdays, Western digits", () => {
    const { container } = renderRoute("/weather", picked);
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: i18n.t("weather.today") }),
    ).toBeInTheDocument();
    const weekdays = dayCards().map(
      (li) => li.querySelector("span")?.textContent,
    );
    expect(new Set(weekdays).size).toBe(7);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
    expect(text).not.toMatch(/\b(weather|units|dataCard)\.|\{\{/);
  });
});
