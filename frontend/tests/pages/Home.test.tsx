import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, expectTypeOf, it } from "vitest";

import farmMap from "../../src/assets/illustrations/farm-map.svg";
import i18n, { LANGUAGES } from "../../src/i18n";
import { farmDiagnostic } from "../../src/mocks/farmDiagnostic";
import { homeSummary } from "../../src/mocks/home";
import type { HomeSummary } from "../../src/types/diagnostic";
import { inLanguage, renderRoute, tabBarLabel } from "../utils";

describe("Home page (design.md §7.2)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("the mock fixture matches HomeSummary and is trimmed from the Farm diagnostic", () => {
    expectTypeOf(homeSummary).toEqualTypeOf<HomeSummary>();
    expect(homeSummary.location).toBe(farmDiagnostic.location);
    expect(homeSummary.soil).toBe(farmDiagnostic.soil);
    expect(homeSummary.climate).toBe(farmDiagnostic.climate);
  });

  it("before a pick: the map is one button to tap, with no summary or CTA yet", () => {
    renderRoute("/home");
    expect(
      screen.getByRole("heading", { level: 1, name: "Accueil" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Touchez la carte pour choisir votre parcelle."),
    ).toBeInTheDocument();
    const pick = screen.getByRole("button", {
      name: "Choisir ma parcelle sur la carte",
    });
    expect(pick.querySelector("img")).toHaveAttribute("src", farmMap);
    expect(
      screen.queryByRole("heading", { name: "Parcelle sélectionnée" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Voir le diagnostic complet" }),
    ).not.toBeInTheDocument();
  });

  it("tapping the map confirms the location and shows the light summary (2 facts only)", async () => {
    const user = userEvent.setup();
    renderRoute("/home");
    await user.click(
      screen.getByRole("button", { name: "Choisir ma parcelle sur la carte" }),
    );

    // Pin + location chip on the map, which is no longer a button.
    expect(
      screen.getByRole("img", { name: "Carte : vue satellite de la parcelle" }),
    ).toHaveAttribute("src", farmMap);
    expect(
      screen.queryByRole("button", {
        name: "Choisir ma parcelle sur la carte",
      }),
    ).not.toBeInTheDocument();

    const summary = screen
      .getByRole("heading", { level: 2, name: "Parcelle sélectionnée" })
      .closest("section") as HTMLElement;
    expect(within(summary).getByText("Béni Mellal")).toBeInTheDocument();
    const facts = within(summary).getAllByRole("term");
    expect(facts.map((dt) => dt.textContent)).toEqual([
      "Texture du sol",
      "Pluie annuelle",
    ]);
    expect(within(summary).getByText("Franco-argileuse")).toBeInTheDocument();
    expect(within(summary).getByText("342 mm/an")).toBeInTheDocument();
    expect(
      within(summary).getByText("Données : ISRIC SoilGrids · NASA POWER"),
    ).toBeInTheDocument();
  });

  it("'Voir le diagnostic complet' is the one CTA and opens Farm with the parcel", async () => {
    const user = userEvent.setup();
    renderRoute("/home", { parcelPicked: true });
    const cta = screen.getByRole("link", {
      name: "Voir le diagnostic complet",
    });
    expect(cta).toHaveAttribute("href", "/farm");
    await user.click(cta);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Votre ferme" }),
    ).toBeInTheDocument();
  });

  it("is a tab-bar root: title-only header, Home tab active", () => {
    renderRoute("/home");
    expect(within(screen.getByRole("banner")).queryByRole("link")).toBeNull();
    const tabBar = screen.getByRole("navigation", { name: tabBarLabel() });
    expect(
      within(tabBar).getByRole("link", { name: "Accueil" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

describe.each(LANGUAGES)("Home page in %s", (lng) => {
  inLanguage(lng);

  it("renders every string translated, before and after the pick", async () => {
    const user = userEvent.setup();
    const { container } = renderRoute("/home");
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    await user.click(screen.getByRole("button", { name: i18n.t("home.pick") }));
    expect(
      screen.getByText(i18n.t("data.texture.clay_loam")),
    ).toBeInTheDocument();
    const text = container.textContent ?? "";
    expect(text).toContain("342");
    expect(text).not.toMatch(/[٠-٩۰-۹]/); // Western digits only (§9a)
    expect(text).not.toMatch(/\b(home|data|units|dataCard)\.|\{\{/);
  });
});
