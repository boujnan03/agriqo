import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, expectTypeOf, it } from "vitest";

import cropLegumineuses from "../../src/assets/illustrations/crop-legumineuses.svg";
import cropOrge from "../../src/assets/illustrations/crop-orge.svg";
import cropWheat from "../../src/assets/illustrations/crop-wheat.svg";
import { SEED_ACCOUNT } from "../../src/auth/seedAccount";
import { cropDetails } from "../../src/mocks/cropDetails";
import type { CropId } from "../../src/types/crop";
import type { CropDetailsById } from "../../src/types/cropDetail";
import { inLanguage, renderRoute, tabBarLabel } from "../utils";

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

  it.each(CROPS)("/crop/$id shows $name's own data", (crop) => {
    renderRoute(`/crop/${crop.id}`);

    expect(
      screen.getByRole("heading", { level: 1, name: "Détails" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: crop.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(crop.description)).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: `Photo : ${crop.name.toLocaleLowerCase("fr")}`,
      }),
    ).toHaveAttribute("src", BANNER[crop.id]);
    // Each value checked against its own row (values can repeat, e.g. "Moyen" twice).
    expect(factValue("Besoin en eau")).toHaveTextContent(crop.waterNeed);
    expect(factValue("Meilleure saison")).toHaveTextContent(crop.bestSeason);
    expect(factValue("Rendement attendu")).toHaveTextContent(
      crop.expectedYield,
    );
    expect(screen.getByText(crop.whyThisChoice)).toBeInTheDocument();

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

  it("Cover login → Home pick → Farm → Insights tab → Recommendations → Crop detail, and back", async () => {
    const user = userEvent.setup();
    renderRoute("/");

    const h1 = (name: string) =>
      screen.findByRole("heading", { level: 1, name });

    await user.type(
      screen.getByLabelText("Nom d'utilisateur"),
      SEED_ACCOUNT.username,
    );
    await user.type(
      screen.getByLabelText("Mot de passe"),
      SEED_ACCOUNT.password,
    );
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    await h1("Accueil");
    await user.click(
      screen.getByRole("button", { name: "Choisir ma parcelle sur la carte" }),
    );
    await user.click(
      screen.getByRole("link", { name: "Voir le diagnostic complet" }),
    );
    await h1("Votre ferme");
    expect(
      screen.getByRole("heading", { level: 2, name: "Sol" }),
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
