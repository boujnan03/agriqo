import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, expectTypeOf, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import { mapData } from "../../src/mocks/map";
import type { MapData } from "../../src/types/map";
import { inLanguage, renderRoute, tabBarLabel } from "../utils";

const LAYER_NAMES_FR = ["Végétation", "Humidité du sol", "Précipitations"];

describe("Map page (design.md §7 template 7)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("the mock fixture matches the MapData type", () => {
    // Type-level check: enforced by `npm run typecheck`.
    expectTypeOf(mapData).toEqualTypeOf<MapData>();
    expect(mapData.layers.map((l) => l.id)).toEqual([
      "vegetation",
      "soilMoisture",
      "rainfall",
    ]);
  });

  it("shows the 3 layers, the default one selected with its legend card", () => {
    renderRoute("/map");
    expect(
      screen.getByRole("heading", { level: 1, name: "Carte" }),
    ).toBeInTheDocument();

    const group = screen.getByRole("radiogroup", { name: "Couche de données" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(LAYER_NAMES_FR);
    expect(
      within(group).getByRole("radio", { name: "Végétation" }),
    ).toBeChecked();

    expect(
      screen.getByRole("img", { name: "Carte : couche végétation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Végétation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Montre la santé de la végétation sur votre parcelle."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Faible (jaune) → Élevée (vert foncé)"),
    ).toBeInTheDocument();
    expect(screen.getByText("NDVI")).toBeInTheDocument();
    expect(
      screen.getByText("Dernière mise à jour : 13 novembre 2026"),
    ).toBeInTheDocument();
    expect(screen.getByText(mapData.location)).toBeInTheDocument();
  });

  it("selecting another layer updates the legend card and the map label", async () => {
    const user = userEvent.setup();
    renderRoute("/map");

    await user.click(screen.getByRole("radio", { name: "Humidité du sol" }));
    expect(
      screen.getByRole("radio", { name: "Humidité du sol" }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: "Végétation" })).not.toBeChecked();
    expect(
      screen.getByRole("heading", { level: 2, name: "Humidité du sol" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Indique le niveau d'humidité du sol en surface."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Montre la santé de la végétation sur votre parcelle.",
      ),
    ).not.toBeInTheDocument();
    // The French file uses non-breaking spaces before "%"; the default matcher normalises them.
    expect(screen.getByText("Sec (0 %) → Saturé (100 %)")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(
      screen.getByText("Dernière mise à jour : 12 novembre 2026"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Carte : couche humidité du sol" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Précipitations" }));
    expect(
      screen.getByText("Cumul des précipitations récentes sur la zone."),
    ).toBeInTheDocument();
    expect(screen.getByText("mm")).toBeInTheDocument();
    expect(
      screen.getByText("Dernière mise à jour : 14 novembre 2026"),
    ).toBeInTheDocument();
  });

  it("is a tab-bar root: Map tab enabled and active, header without back arrow", () => {
    renderRoute("/map");
    const tabBar = screen.getByRole("navigation", { name: tabBarLabel() });
    expect(within(tabBar).getByRole("link", { name: "Carte" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(screen.getByRole("banner")).queryByRole("link")).toBeNull();
  });

  it("the Map tab is reachable from another tab-bar screen", async () => {
    const user = userEvent.setup();
    renderRoute("/farm");
    await user.click(screen.getByRole("link", { name: "Carte" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Carte" }),
    ).toBeInTheDocument();
  });
});

describe.each(LANGUAGES)("Map page in %s", (lng) => {
  inLanguage(lng);

  it("renders every string translated, with Western digits in the date", () => {
    const { container } = renderRoute("/map");
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: i18n.t("map.title") }),
    ).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", {
      name: i18n.t("map.layerSwitcher"),
    });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((r) => r.textContent),
    ).toEqual(mapData.layers.map((l) => i18n.t(l.labelKey)));
    expect(
      screen.getByText(i18n.t("map.legends.vegetation")),
    ).toBeInTheDocument();

    const text = container.textContent ?? "";
    expect(text).toContain("13");
    expect(text).toContain("2026");
    expect(text).not.toMatch(/[٠-٩۰-۹]/); // no Eastern Arabic digits
    expect(text).not.toMatch(/\bmap\.|\{\{/); // no leaked key or placeholder
  });
});

describe("Map segmented control in RTL (design.md §9a)", () => {
  /** Focus the selected option, press `key`, return the newly selected option's name. */
  const press = async (key: string) => {
    const user = userEvent.setup();
    renderRoute("/map");
    const selected = screen.getByRole("radio", { checked: true });
    selected.focus();
    await user.keyboard(`{${key}}`);
    const now = screen.getByRole("radio", { checked: true });
    expect(now).toHaveFocus();
    return now.textContent;
  };

  it("keeps one tab stop: only the selected option is focusable by Tab", () => {
    renderRoute("/map");
    const tabbable = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBeChecked();
  });

  it("Arabic: the row runs right-to-left, so ArrowLeft moves to the next layer", async () => {
    await i18n.changeLanguage("ar");
    expect(await press("ArrowLeft")).toBe(i18n.t("map.layers.soilMoisture"));
  });

  it("Arabic: ArrowRight moves back (wrapping to the last layer)", async () => {
    await i18n.changeLanguage("ar");
    expect(await press("ArrowRight")).toBe(i18n.t("map.layers.rainfall"));
  });

  it("French: ArrowRight moves to the next layer", async () => {
    await i18n.changeLanguage("fr");
    expect(await press("ArrowRight")).toBe("Humidité du sol");
  });

  it("French: ArrowLeft wraps to the last layer", async () => {
    await i18n.changeLanguage("fr");
    expect(await press("ArrowLeft")).toBe("Précipitations");
  });
});
