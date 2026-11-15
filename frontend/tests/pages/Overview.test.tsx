import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import { fakeBackend, pending, unreachable } from "../fakeBackend";
import { inLanguage, picked, renderRoute, tabBarLabel } from "../utils";

/** The <section> under the h2 named `name`, once it is on screen. */
const section = async (name: string) =>
  (await screen.findByRole("heading", { level: 2, name })).closest(
    "section",
  ) as HTMLElement;

describe("Insights page (design.md §7.4) with the real diagnostic", () => {
  inLanguage("fr");

  it("climate summary: the response's real mean, typical high and annual rainfall (no min: not sent)", async () => {
    renderRoute("/overview", picked);
    const summary = await section("Résumé climatique");
    const stats = Object.fromEntries(
      within(summary)
        .getAllByRole("term")
        .map((dt) => [
          dt.textContent,
          dt.nextElementSibling?.textContent?.replace(/\u00a0/g, " "),
        ]),
    );
    expect(stats).toEqual({
      "Température moyenne": "17,9 °C",
      "Maximale habituelle": "31,5 °C",
      "Pluie annuelle": "526 mm/an",
    });
    expect(within(summary).getByText("Moyennes 2001-2025")).toBeInTheDocument();
    expect(
      within(summary).getByText("Données : NASA POWER"),
    ).toBeInTheDocument();
  });

  it("no monthly chart (the backend has no monthly values): the real season rain chart replaces the placeholder", async () => {
    const { container } = renderRoute("/overview", picked);
    await section("Pluie des 10 dernières saisons");
    expect(screen.queryByText(/valeurs mensuelles/)).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Température et précipitations" }),
    ).toBeNull();
    expect(container.querySelector("polyline")).toBeNull();
  });

  it("frost days and soil moisture come from the same response", async () => {
    renderRoute("/overview", picked);
    const frost = await section("Jours de gel");
    expect(frost).toHaveTextContent("4");
    expect(
      within(frost).getByText("Du 15 novembre 2025 au 12 novembre 2026"),
    ).toBeInTheDocument();
    const moisture = screen.getByRole("progressbar", {
      name: "Humidité du sol en surface",
    });
    expect(moisture).toHaveAttribute("aria-valuenow", "49");
    expect(screen.getByText("49%")).toBeInTheDocument();
  });

  it("reuses Farm's diagnostic: Farm → Insights tab makes ONE request in total", async () => {
    const user = userEvent.setup();
    renderRoute("/farm", picked);
    await section("Sol");
    const tabBar = screen.getByRole("navigation", { name: tabBarLabel() });
    await user.click(within(tabBar).getByRole("link", { name: "Analyses" }));
    await section("Résumé climatique");
    expect(fakeBackend.calls.map((c) => c.route)).toEqual(["diagnostic"]);
  });

  it("loading and backend-error states, like Farm", async () => {
    fakeBackend.respond("diagnostic", pending);
    const { unmount } = renderRoute("/overview", picked);
    // The season section has its own request: once it has answered, the remaining status is
    // the diagnostic's.
    await section("Dernière saison disponible : 2024–2025");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement des données de votre parcelle…",
    );
    unmount();
    fakeBackend.respond("diagnostic", unreachable);
    renderRoute("/overview", picked);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Serveur injoignable",
    );
  });

  it("before any pick: the empty state, no request; Health Index + CTA still there", () => {
    renderRoute("/overview");
    expect(
      screen.getByRole("heading", { name: "Aucune parcelle choisie" }),
    ).toBeInTheDocument();
    expect(fakeBackend.calls).toEqual([]);
    expect(
      screen.getByRole("link", { name: "Voir mes recommandations" }),
    ).toHaveAttribute("href", "/recommendations");
  });

  it("Health Index is an explicit 'not yet available' placeholder, with no score at all", async () => {
    renderRoute("/overview", picked);
    const health = await section("Indice de santé");
    expect(
      within(health).getByText("Bientôt disponible (NDVI)"),
    ).toBeInTheDocument();
    expect(health.textContent).not.toMatch(/\d|%/);
    await section("Jours de gel");
    await section("Dernière saison disponible : 2024–2025");
    // Every bar on the page is real data: none belongs to the Health Index.
    expect(
      screen
        .getAllByRole("progressbar")
        .map((bar) => bar.getAttribute("aria-label")),
    ).toEqual([
      "Pluie par rapport à la normale",
      "Saison 2024–2025",
      "Humidité du sol en surface",
    ]);
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

describe.each(LANGUAGES)("Insights page in %s", (lng) => {
  inLanguage(lng);

  it("renders every string translated, with Western digits", async () => {
    const { container } = renderRoute("/overview", picked);
    await section(i18n.t("overview.climateSummary"));
    const text = container.textContent ?? "";
    expect(text).toContain("526");
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
    expect(text).not.toMatch(/\b(overview|units|dataCard|request)\.|\{\{/);
  });
});
