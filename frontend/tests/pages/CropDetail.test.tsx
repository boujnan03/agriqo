import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, expectTypeOf, it } from "vitest";

import cropLegumineuses from "../../src/assets/illustrations/crop-legumineuses.svg";
import cropOrge from "../../src/assets/illustrations/crop-orge.svg";
import cropWheat from "../../src/assets/illustrations/crop-wheat.svg";
import i18n from "../../src/i18n";
import { cropDetails } from "../../src/mocks/cropDetails";
import type { CropId } from "../../src/types/crop";
import type { CropDetailsById } from "../../src/types/cropDetail";
import { drawParcel, inLanguage, renderRoute, tabBarLabel } from "../utils";

const CROPS = (Object.keys(cropDetails) as CropId[]).map((id) => ({
  id,
  ...cropDetails[id],
}));

/** The illustration file each crop's banner must use (same file as its thumbnail). */
const BANNER: Record<CropId, string> = {
  ble: cropWheat,
  orge: cropOrge,
  legumineuses: cropLegumineuses,
};

/** Each crop's best season in French: month names formatted by the browser's Intl (fr-FR). */
const SEASON_FR: Record<CropId, string> = {
  ble: "nov. – mars",
  orge: "oct. – févr.",
  legumineuses: "déc. – avr.",
};

/** The value (<dd>) of the fact row whose label (<dt>) is `label`. */
const factValue = (label: string) =>
  screen.getByText(label, { selector: "dt" }).nextElementSibling;

describe("Crop detail page (design.md §7.5)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("the mock lookup covers every CropId with a CropDetail", () => {
    // Type-level check (Record<CropId, …>): enforced by `npm run typecheck`.
    expectTypeOf(cropDetails).toEqualTypeOf<CropDetailsById>();
    expect(CROPS.map((c) => c.id).sort()).toEqual(
      ["ble", "legumineuses", "orge"].sort(),
    );
  });

  it.each(CROPS)("/crop/$id shows its own data, all translated", (crop) => {
    renderRoute(`/crop/${crop.id}`);
    // Every word comes from the translation files (fr here), keyed by the crop id.
    const name = i18n.t(`crops.${crop.id}.name`);

    expect(
      screen.getByRole("heading", { level: 1, name: "Détails" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t(`crops.${crop.id}.description`)),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: `Photo : ${name.toLocaleLowerCase("fr")}`,
      }),
    ).toHaveAttribute("src", BANNER[crop.id]);
    // Each value checked against its own row (values can repeat, e.g. "Moyen" twice).
    expect(factValue("Besoin en eau")).toHaveTextContent(
      i18n.t(`crops.level.${crop.waterNeed}`),
    );
    expect(factValue("Meilleure saison")).toHaveTextContent(SEASON_FR[crop.id]);
    expect(factValue("Rendement attendu")).toHaveTextContent(
      i18n.t(`crops.level.${crop.expectedYield}`),
    );
    expect(
      screen.getByText(i18n.t(`crops.${crop.id}.why`)),
    ).toBeInTheDocument();

    // "Recommandé" badge only for the recommended crop (ble in the fixture).
    expect(screen.queryByText("Recommandé") !== null).toBe(crop.recommended);
    expect(crop.recommended).toBe(crop.id === "ble");

    // Drill-in chrome: back arrow to recommendations, no tab bar.
    expect(
      screen.getByRole("link", { name: "Retour aux recommandations" }),
    ).toHaveAttribute("href", "/recommendations");
    expect(
      screen.queryByRole("navigation", { name: tabBarLabel() }),
    ).not.toBeInTheDocument();
  });

  it("'Enregistrer ce plan' shows a local confirmation (no persistence)", async () => {
    const user = userEvent.setup();
    renderRoute("/crop/ble");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.click(
      screen.getByRole("button", { name: "Enregistrer ce plan" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Plan enregistré");
  });

  it("an unknown crop id renders the Not found page", () => {
    renderRoute("/crop/mais");
    expect(
      screen.getByRole("heading", { level: 1, name: "Page introuvable." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Retour à l'accueil" }),
    ).toHaveAttribute("href", "/");
  });
});

describe("full mocked click-through", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("Cover → Home pick → Farm → Insights tab → Recommendations → Crop detail, and back", async () => {
    const user = userEvent.setup();
    renderRoute("/");

    const h1 = (name: string) =>
      screen.findByRole("heading", { level: 1, name });

    await user.click(screen.getByRole("link", { name: "Commencer" }));
    await h1("Accueil");
    drawParcel();
    await user.click(
      screen.getByRole("link", { name: "Voir le diagnostic complet" }),
    );
    await h1("Votre ferme");
    expect(
      await screen.findByRole("heading", { level: 2, name: "Sol" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Analyses" }));
    await h1("Aperçu de la ferme");
    await user.click(
      screen.getByRole("link", { name: "Voir mes recommandations" }),
    );
    await h1("Recommandations");
    await user.click(screen.getByRole("link", { name: "Orge 85%" }));
    await h1("Détails");
    expect(
      screen.getByRole("heading", { level: 2, name: "Orge" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("link", { name: "Retour aux recommandations" }),
    );
    await h1("Recommandations");
    await user.click(
      screen.getByRole("link", { name: "Retour à l'aperçu de la ferme" }),
    );
    expect(await h1("Aperçu de la ferme")).toBeInTheDocument();
  });
});
