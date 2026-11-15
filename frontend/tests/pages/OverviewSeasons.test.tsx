import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import type { ZoneCovered } from "../../src/types/seasons";
import {
  fakeBackend,
  fixtures,
  json,
  pending,
  unreachable,
} from "../fakeBackend";
import { inLanguage, picked, renderRoute, TADLA } from "../utils";

/** The <section> under the h2 named `name`, once it is on screen. */
const section = async (name: string) =>
  (await screen.findByRole("heading", { level: 2, name })).closest(
    "section",
  ) as HTMLElement;

/** label → value pairs of a section's fact rows (French non-breaking spaces normalised). */
const rows = (el: HTMLElement) =>
  within(el)
    .queryAllByRole("term")
    .map((dt) => [
      dt.textContent,
      dt.nextElementSibling?.textContent?.replace(/\u00a0/g, " "),
    ]);

const text = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\u00a0/g, " ");

const LAST = "Dernière saison disponible : 2024–2025";
const SOURCE = "Source : NASA POWER, normale 1996–2025 de votre zone (~50 km).";

describe("Insights: season types of the parcel's NASA POWER cell (real C057 answer)", () => {
  inLanguage("fr");

  it("asks the season endpoint once, for the parcel's centroid and the default water regime", async () => {
    renderRoute("/overview", picked);
    await section(LAST);
    expect(fakeBackend.seasonCalls).toHaveLength(1);
    expect(fakeBackend.seasonCalls[0]).toMatchObject({
      route: "seasons",
      lat: TADLA.lat,
      lon: TADLA.lon,
      water: "pluvial",
    });
  });

  it("asks with the water regime chosen on Farm (shared state)", async () => {
    const user = userEvent.setup();
    renderRoute("/farm", picked);
    await user.click(await screen.findByRole("radio", { name: "Irriguée" }));
    await user.click(screen.getByRole("link", { name: "Analyses" }));
    await section(LAST);
    expect(fakeBackend.seasonCalls.at(-1)).toMatchObject({ water: "irrigue" });
  });

  it("latest available season: 2024–2025 · Sèche et chaude · 81 % of the normal, hot days, source", async () => {
    renderRoute("/overview", picked);
    const last = await section(LAST);
    expect(within(last).getByText("Sèche")).toBeInTheDocument(); // badge
    expect(within(last).getByText("Sèche et chaude")).toBeInTheDocument();
    expect(rows(last)).toEqual([
      ["Pluie", "370,6 mm · normale 458,6 mm"],
      ["Jours > 30 °C (mars–mai)", "16 · normale 12,6"],
    ]);
    const bar = within(last).getByRole("progressbar", {
      name: "Pluie par rapport à la normale",
    });
    expect(bar).toHaveAttribute("aria-valuenow", "81");
    expect(bar.getAttribute("aria-valuetext")?.replace(/\u00a0/g, " ")).toBe(
      "81 %",
    );
    expect(within(last).queryByText(/Classement limite/)).toBeNull();
    expect(within(last).queryByText(/Zone voisine/)).toBeNull();
    expect(within(last).getByText(SOURCE)).toBeInTheDocument();
  });

  it("rain of the last 10 seasons: 10 bars + the normal line, every value written", async () => {
    const { container } = renderRoute("/overview", picked);
    const chartCard = await section("Pluie des 10 dernières saisons");
    expect(container.querySelectorAll("[data-season]")).toHaveLength(10);
    expect(container.querySelectorAll('[data-point="normal"]')).toHaveLength(1);
    const chart = within(chartCard).getByRole("img");
    const label = chart.getAttribute("aria-label")?.replace(/\u00a0/g, " ");
    expect(label).toContain("2015–2016 : 229,9 mm");
    expect(label).toContain("2024–2025 : 370,6 mm");
    expect(label).toContain("Normale : 458,6 mm");
    expect(text(chartCard)).toContain("230"); // printed under the 2016 bar
    expect(
      within(chartCard).getByText("Pluie de la saison (mm), barres"),
    ).toBeInTheDocument();
    expect(
      within(chartCard).getByText(/^Normale : 458,6\smm, ligne$/),
    ).toBeInTheDocument();
  });

  it("the last 10 seasons, most recent first, with the dry count and the Field Shift message", async () => {
    renderRoute("/overview", picked);
    const history = await section("Vos 10 dernières saisons");
    expect(
      within(history).getByText("Saisons sèches et chaudes : 9 sur 10"),
    ).toBeInTheDocument();
    const list = rows(history);
    expect(list).toHaveLength(10);
    expect(list[0]).toEqual(["2024–2025", "Sèche et chaude · 81 %"]);
    expect(list[7]).toEqual(["2017–2018", "Normale et fraîche · 112 %"]);
    expect(list[9]).toEqual(["2015–2016", "Sèche et chaude · 50 %"]);
    expect(text(history.querySelector('[data-advice="field_shift"]'))).toBe(
      "Par rapport à 1996–2025 : saisons sèches et chaudes 9 sur 10 depuis 2015–2016, contre 3 sur 20 de 1995–1996 à 2014–2015.",
    );
  });

  it("root-zone moisture of the last season against its normal", async () => {
    renderRoute("/overview", picked);
    const moisture = await section("Humidité de la zone racinaire (oct.–mai)");
    const bar = within(moisture).getByRole("progressbar", {
      name: "Saison 2024–2025",
    });
    expect(bar.getAttribute("aria-valuetext")?.replace(/\u00a0/g, " ")).toBe(
      "51 %",
    );
    expect(text(moisture)).toContain("Normale : 58 %");
  });

  it("the diagnostic cards are still there, from the diagnostic response", async () => {
    renderRoute("/overview", picked);
    await section(LAST);
    expect(await section("Résumé climatique")).toHaveTextContent("526");
    expect(await section("Jours de gel")).toHaveTextContent("4");
  });

  it("a borderline season says so (card + list)", async () => {
    const zone = structuredClone(fixtures.zoneC057) as ZoneCovered;
    zone.lastSeason.borderline = true;
    zone.history[zone.history.length - 1].borderline = true;
    fakeBackend.respond("seasons", json(zone));
    renderRoute("/overview", picked);
    const last = await section(LAST);
    expect(
      within(last).getByText(
        "Classement limite : cette saison est proche de deux types.",
      ),
    ).toBeInTheDocument();
    const history = await section("Vos 10 dernières saisons");
    expect(rows(history)[0]).toEqual([
      "2024–2025",
      "Sèche et chaude · 81 % · limite",
    ]);
  });

  it("proche (real C113 answer): the data, a 'zone voisine' note with the distance, no Field Shift", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneC113Proche));
    renderRoute("/overview", picked);
    const last = await section(LAST);
    expect(text(last.querySelector('[data-zone="proche"]'))).toBe(
      "Zone voisine : votre parcelle est juste hors des cellules couvertes ; ces données sont celles de la cellule la plus proche (~35 km).",
    );
    expect(within(last).getByText("Normale et chaude")).toBeInTheDocument();
    const history = await section("Vos 10 dernières saisons");
    expect(history.querySelector('[data-advice="field_shift"]')).toBeNull();
  });

  it("heatRelevant false (real C046 answer): type name without hot/cool, no hot-days row", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneC046NoHeat));
    renderRoute("/overview", picked);
    const last = await section(LAST);
    expect(within(last).queryByText("Normale et chaude")).toBeNull();
    expect(within(last).getAllByText("Normale")).toHaveLength(2); // badge + name
    expect(rows(last).map(([label]) => label)).toEqual(["Pluie"]);
    expect(text(last)).not.toContain("30 °C");
  });

  it("hors_zone (real ocean answer): one card with the distance to the nearest cell and a way back to Home", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneOcean));
    renderRoute("/overview", picked);
    const outside = await section("Hors de la zone couverte");
    expect(text(outside)).toContain(
      "Votre parcelle est hors de la zone couverte (Maroc, au nord de 29,5° N). Cellule la plus proche à ~85 km.",
    );
    expect(
      within(outside).getByRole("link", { name: "Choisir une autre parcelle" }),
    ).toHaveAttribute("href", "/home");
    expect(
      screen.queryByRole("heading", { name: /Dernière saison/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Pluie des 10 dernières saisons" }),
    ).toBeNull();
    // The diagnostic part of the page is independent and still shown.
    expect(await section("Résumé climatique")).toBeInTheDocument();
  });

  it("loading: the season section's own status while its request is in flight", async () => {
    fakeBackend.respond("seasons", pending);
    renderRoute("/overview", picked);
    await section("Résumé climatique");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement des données de votre parcelle…",
    );
    expect(
      screen.queryByRole("heading", { name: /Dernière saison/ }),
    ).toBeNull();
  });

  it.each([
    ["unreachable", unreachable],
    [
      "HTTP 503 (model not loaded)",
      json({ detail: { code: "model_unavailable" } }, 503),
    ],
  ])(
    "error (%s): an alert with Réessayer, which re-asks and shows the data",
    async (_, failure) => {
      const user = userEvent.setup();
      fakeBackend.respond("seasons", failure);
      renderRoute("/overview", picked);
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Serveur injoignable");
      fakeBackend.respond("seasons", json(fixtures.zoneC057));
      await user.click(
        within(alert).getByRole("button", { name: "Réessayer" }),
      );
      expect(await section(LAST)).toBeInTheDocument();
      expect(fakeBackend.seasonCalls).toHaveLength(2);
    },
  );

  it("before any pick: no season request at all", () => {
    renderRoute("/overview");
    expect(fakeBackend.seasonCalls).toEqual([]);
  });
});

describe("Insights season section in Arabic (RTL)", () => {
  it("is right-to-left, with Western digits only and seasons as 2024–2025", async () => {
    const { container } = renderRoute("/overview", picked);
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    await section("آخر موسم متاح: 2024–2025");
    const all = container.textContent ?? "";
    expect(all).toContain("جافة وحارة");
    expect(all).toContain("370,6"); // ar-MA: decimal comma, Western digits
    expect(all).toContain("2015–2016");
    expect(all).not.toMatch(/[٠-٩۰-۹]/);
    const chart = screen.getByRole("img", { name: /الأمطار حسب الموسم/ });
    expect(chart.getAttribute("aria-label")).not.toMatch(/[٠-٩۰-۹]/);
  });
});

describe.each(LANGUAGES)("Insights season section in %s", (lng) => {
  inLanguage(lng);

  it("every string translated, no key or placeholder leaked, Western digits", async () => {
    const { container } = renderRoute("/overview", picked);
    await section(i18n.t("seasons.lastTitle", { season: "2024–2025" }));
    await section(i18n.t("seasons.historyTitle"));
    const labels = [...container.querySelectorAll("[aria-label]")].map(
      (el) => el.getAttribute("aria-label") ?? "",
    );
    const shown = [container.textContent ?? "", ...labels].join("\n");
    expect(shown).not.toMatch(/\bseasons\.|\{\{|\}\}/);
    expect(shown).not.toMatch(/[٠-٩۰-۹]/);
    expect(shown).toContain("2024–2025");
  });
});
