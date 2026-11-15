import { screen, within } from "@testing-library/react";
import { describe, expect, expectTypeOf, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import { farmDiagnostic } from "../../src/mocks/farmDiagnostic";
import type { FarmDiagnostic } from "../../src/types/diagnostic";
import { inLanguage, renderRoute, tabBarLabel } from "../utils";

/** The Data card <section> under the h2 named `name`. */
const card = (name: string) =>
  screen
    .getByRole("heading", { level: 2, name })
    .closest("section") as HTMLElement;

/** label → value pairs of a card's fact rows. */
const rows = (section: HTMLElement) =>
  Object.fromEntries(
    within(section)
      .queryAllByRole("term")
      .map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]),
  );

describe("Farm page (design.md §7.3)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("the mock fixture matches FarmDiagnostic; Relief is the unavailable one", () => {
    expectTypeOf(farmDiagnostic).toEqualTypeOf<FarmDiagnostic>();
    expect(farmDiagnostic.relief.status).toBe("indisponible");
  });

  it("with a picked parcel: the 4 Data cards, in order, and no photo banner", () => {
    const { container } = renderRoute("/farm", { parcelPicked: true });
    expect(
      screen.getByRole("heading", { level: 1, name: "Votre ferme" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["Sol", "Climat", "Humidité", "Relief"]);
    expect(screen.getByText("Béni Mellal")).toBeInTheDocument();
    // Data only: the Header's logo mark is the only image (§7.3, §8).
    expect(container.querySelectorAll("main img")).toHaveLength(0);
  });

  it("each ok card shows its values and its own source", () => {
    renderRoute("/farm", { parcelPicked: true });
    // The default text matcher normalises the French non-breaking spaces before units.
    const norm = (r: Record<string, string | undefined>) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, v?.replace(/\u00a0/g, " ")]),
      );

    expect(norm(rows(card("Sol")))).toEqual({
      Texture: "Franco-argileuse",
      pH: "8,1",
      "Carbone organique": "8,6 g/kg",
    });
    expect(
      within(card("Sol")).getByText("Données : ISRIC SoilGrids"),
    ).toBeInTheDocument();

    expect(norm(rows(card("Climat")))).toEqual({
      "Température moyenne": "18,9 °C",
      "Température max. moyenne": "26,4 °C",
      "Pluie annuelle": "342 mm/an",
      "Jours de gel par an": "4",
    });
    expect(
      within(card("Climat")).getByText("Données : NASA POWER"),
    ).toBeInTheDocument();

    expect(norm(rows(card("Humidité")))).toEqual({
      "Humidité du sol en surface": "34 %",
      Niveau: "Moyen",
    });
    expect(
      within(card("Humidité")).getByText("Données : NASA POWER"),
    ).toBeInTheDocument();
  });

  it("Relief (indisponible) shows the fallback message, its source, and no number", () => {
    renderRoute("/farm", { parcelPicked: true });
    const relief = card("Relief");
    expect(relief).toHaveAttribute("data-status", "indisponible");
    expect(within(relief).getByText("Donnée indisponible")).toBeInTheDocument();
    expect(
      within(relief).getByText("Données : OpenTopography"),
    ).toBeInTheDocument();
    expect(rows(relief)).toEqual({});
    expect(relief.textContent).not.toMatch(/\d/);
  });

  it("before any pick: a short empty state pointing back to Home, no Data cards", () => {
    renderRoute("/farm");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Aucune parcelle choisie",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choisissez d'abord votre parcelle sur la carte de l'accueil.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Choisir ma parcelle" }),
    ).toHaveAttribute("href", "/home");
    expect(
      screen.queryByRole("heading", { name: "Sol" }),
    ).not.toBeInTheDocument();
  });

  it("is a tab-bar root: title-only header, Farm tab active", () => {
    renderRoute("/farm");
    expect(within(screen.getByRole("banner")).queryByRole("link")).toBeNull();
    const tabBar = screen.getByRole("navigation", { name: tabBarLabel() });
    // Tab mapping (design.md §6): /farm is the "Farm" tab ("Ferme" in French).
    expect(within(tabBar).getByRole("link", { name: "Ferme" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe.each(LANGUAGES)("Farm page in %s", (lng) => {
  inLanguage(lng);

  it("renders every string translated, with Western digits", () => {
    const { container } = renderRoute("/farm", { parcelPicked: true });
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(
      ["soil", "climate", "humidity", "relief"].map((k) =>
        i18n.t(`farm.${k}` as "farm.soil"),
      ),
    );
    expect(
      screen.getByText(i18n.t("dataCard.unavailable")),
    ).toBeInTheDocument();
    const text = container.textContent ?? "";
    expect(text).toContain("342");
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
    expect(text).not.toMatch(/\b(farm|data|units|dataCard)\.|\{\{/);
  });
});
