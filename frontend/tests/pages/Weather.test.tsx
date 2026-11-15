import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import type { WeatherCondition, WeatherDay } from "../../src/types/weather";
import { fakeBackend, fixtures, json, unreachable } from "../fakeBackend";
import { inLanguage, picked, renderRoute, TADLA, tabBarLabel } from "../utils";

/** The day cards, as listitems of the "next 7 days" list (once the forecast has arrived). */
const dayCards = async () =>
  within(
    await screen.findByRole("list", { name: i18n.t("weather.next7") }),
  ).getAllByRole("listitem");

/** Every condition the backend can send, with the lucide icon it must be drawn with. */
const CONDITIONS: [WeatherCondition, string][] = [
  ["sunny", "sun"],
  ["partlyCloudy", "cloud-sun"],
  ["cloudy", "cloud"],
  ["fog", "cloud-fog"],
  ["drizzle", "cloud-drizzle"],
  ["showers", "cloud-sun-rain"],
  ["rain", "cloud-rain"],
  ["snow", "cloud-snow"],
  ["thunderstorm", "cloud-lightning"],
  ["unknown", "circle-help"],
];

/** A forecast whose days cover every condition (one day each), built from the real one. */
const allConditionsForecast = () => {
  const base = fixtures.forecastTadla;
  if (base.status !== "ok") throw new Error("fixture must be ok");
  const days: WeatherDay[] = CONDITIONS.map(([condition], i) => ({
    ...base.days[0],
    date: `2026-12-${String(i + 1).padStart(2, "0")}`,
    condition,
  }));
  return { ...base, days };
};

describe("Weather page (design.md §7.8) with the real backend forecast", () => {
  inLanguage("fr");

  it("asks the backend for the picked coordinates and shows today's real summary", async () => {
    renderRoute("/weather", picked);
    const today = (
      await screen.findByRole("heading", { level: 2, name: "Aujourd'hui" })
    ).closest("section") as HTMLElement;
    expect(fakeBackend.calls).toEqual([
      { route: "forecast", lat: TADLA.lat, lon: TADLA.lon },
    ]);
    expect(today).toHaveAttribute("data-status", "ok");
    expect(within(today).getByText("21,1 °C")).toBeInTheDocument();
    expect(within(today).getByText("Ensoleillé")).toBeInTheDocument();
    const facts = Object.fromEntries(
      within(today)
        .getAllByRole("term")
        .map((dt) => [
          dt.textContent,
          dt.nextElementSibling?.textContent?.replace(/\u00a0/g, " "),
        ]),
    );
    expect(facts).toEqual({
      "Risque de pluie": "0 %",
      "Humidité de l'air": "62 %",
      Vent: "2,8 km/h",
    });
    expect(screen.getByText("Données : Open-Meteo")).toBeInTheDocument();
    expect(screen.queryByText(/NASA POWER/)).not.toBeInTheDocument();
  });

  it("shows the 7 real days in order: weekday, condition icon, high°/low°", async () => {
    renderRoute("/weather", picked);
    const cards = await dayCards();
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
      within(cards[0]).getByRole("img", { name: "Brouillard" }),
    ).toBeInTheDocument();
    expect(
      within(cards[4]).getByRole("img", { name: "Nuageux" }),
    ).toBeInTheDocument();
    if (fixtures.forecastTadla.status !== "ok") throw new Error("fixture");
    fixtures.forecastTadla.days.forEach((day, i) => {
      expect(cards[i]).toHaveTextContent(`${Math.round(day.temp_max_c!)}°`);
      expect(cards[i]).toHaveTextContent(`${Math.round(day.temp_min_c!)}°`);
    });
  });

  it("forecast indisponible (backend answered, Open-Meteo failed): the card says so, no days, no numbers", async () => {
    fakeBackend.respond(
      "forecast",
      json({
        status: "indisponible",
        source: "Open-Meteo",
        error: "timeout",
        location: TADLA,
      }),
    );
    const { container } = renderRoute("/weather", picked);
    const today = (
      await screen.findByRole("heading", { level: 2, name: "Aujourd'hui" })
    ).closest("section") as HTMLElement;
    expect(today).toHaveAttribute("data-status", "indisponible");
    expect(within(today).getByText("Donnée indisponible")).toBeInTheDocument();
    expect(screen.getByText("Données : Open-Meteo")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "7 prochains jours" }),
    ).toBeNull();
    // Only the parcel's own coordinates contain digits; no forecast number anywhere.
    const main = container.querySelector("main") as HTMLElement;
    expect(main.textContent?.replace(/Lat\. .*?Long\. \S+/, "")).not.toMatch(
      /\d/,
    );
  });

  it("our backend unreachable: the request error state, distinct from 'indisponible'", async () => {
    fakeBackend.respond("forecast", unreachable);
    renderRoute("/weather", picked);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Serveur injoignable",
    );
    expect(screen.queryByText("Donnée indisponible")).toBeNull();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  });

  it("a null temperature stays missing (never 0°)", async () => {
    const forecast = allConditionsForecast();
    forecast.days[0] = { ...forecast.days[0], temp_max_c: null };
    fakeBackend.respond("forecast", json(forecast));
    renderRoute("/weather", picked);
    const [first] = await dayCards();
    expect(first).toHaveTextContent("Non disponible");
    expect(first).not.toHaveTextContent("0°");
  });

  it("is daily only: no hourly view, no metric tabs or switcher", async () => {
    renderRoute("/weather", picked);
    await dayCards();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("before any pick: the empty state pointing back to Home, no request", () => {
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
    expect(fakeBackend.calls).toEqual([]);
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

  it("all 10 conditions render with their own icon and a translated label", async () => {
    fakeBackend.respond("forecast", json(allConditionsForecast()));
    renderRoute("/weather", picked);
    const cards = await dayCards();
    expect(cards).toHaveLength(CONDITIONS.length);
    CONDITIONS.forEach(([condition, iconName], i) => {
      const label = i18n.t(`weather.conditions.${condition}`);
      expect(label).not.toMatch(/weather\.conditions/); // a real translation exists
      const icon = within(cards[i]).getByRole("img", { name: label });
      expect(icon).toHaveClass(`lucide-${iconName}`);
    });
    // 10 conditions → 10 distinct icons and 10 distinct labels.
    const labels = CONDITIONS.map(([c]) => i18n.t(`weather.conditions.${c}`));
    expect(new Set(labels).size).toBe(CONDITIONS.length);
  });

  it("renders every string translated, 7 distinct weekdays, Western digits", async () => {
    const { container } = renderRoute("/weather", picked);
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    const weekdays = (await dayCards()).map(
      (li) => li.querySelector("span")?.textContent,
    );
    expect(new Set(weekdays).size).toBe(7);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
    expect(text).not.toMatch(/\b(weather|units|dataCard|request)\.|\{\{/);
  });
});
