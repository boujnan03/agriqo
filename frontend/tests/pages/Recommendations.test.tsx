import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, expectTypeOf, it } from "vitest";

import { recommendationsData } from "../../src/mocks/recommendations";
import type { RecommendationsData } from "../../src/types/recommendations";
import { inLanguage, renderRoute, tabBarLabel } from "../utils";

const { featured, otherOptions, rotationPlan } = recommendationsData;

describe("Recommendations page (design.md §7.4)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("the mock fixture matches the RecommendationsData type", () => {
    // Type-level check: enforced by `npm run typecheck`.
    expectTypeOf(recommendationsData).toEqualTypeOf<RecommendationsData>();
  });

  it("shows the featured crop and the other options with their percentages", () => {
    renderRoute("/recommendations");
    expect(
      screen.getByRole("heading", { level: 1, name: "Recommandations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: `Meilleure culture pour vous ${featured.name}`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(featured.suitability)).toBeInTheDocument();
    for (const option of otherOptions) {
      expect(
        screen.getByRole("link", {
          name: `${option.name} ${option.matchPercent}%`,
        }),
      ).toBeInTheDocument();
    }
  });

  it("shows the 3 rotation steps in order", () => {
    renderRoute("/recommendations");
    const plan = screen.getByRole("list", {
      name: "Plan de rotation des cultures",
    });
    const steps = within(plan).getAllByRole("link");
    expect(steps.map((s) => s.textContent)).toEqual(
      rotationPlan.map(
        (step) => `${step.year}Année ${step.year} ${step.cropName}`,
      ),
    );
  });

  it("is a drill-in screen: back arrow to the dashboard, no tab bar", () => {
    renderRoute("/recommendations");
    expect(
      screen.getByRole("link", { name: "Retour à l'aperçu de la ferme" }),
    ).toHaveAttribute("href", "/overview");
    expect(
      screen.queryByRole("navigation", { name: tabBarLabel() }),
    ).not.toBeInTheDocument();
  });

  it("links every card and step to its crop detail page", () => {
    renderRoute("/recommendations");
    for (const step of rotationPlan) {
      expect(
        screen.getByRole("link", {
          name: `Année ${step.year} ${step.cropName}`,
        }),
      ).toHaveAttribute("href", `/crop/${step.cropId}`);
    }
    expect(
      screen.getByRole("link", { name: "En savoir plus" }),
    ).toHaveAttribute("href", `/crop/${featured.id}`);
  });
});

describe("Recommendations navigation", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("tapping an option card opens that crop's detail page", async () => {
    const user = userEvent.setup();
    renderRoute("/recommendations");
    const option = otherOptions[0];
    await user.click(
      screen.getByRole("link", {
        name: `${option.name} ${option.matchPercent}%`,
      }),
    );
    expect(
      await screen.findByRole("heading", { level: 2, name: option.name }),
    ).toBeInTheDocument();
  });

  it("'En savoir plus' opens the featured crop's detail page", async () => {
    const user = userEvent.setup();
    renderRoute("/recommendations");
    await user.click(screen.getByRole("link", { name: "En savoir plus" }));
    expect(
      await screen.findByRole("heading", { level: 2, name: featured.name }),
    ).toBeInTheDocument();
  });

  it("is reachable from the dashboard's 'Voir mes recommandations' button", async () => {
    const user = userEvent.setup();
    renderRoute("/overview");
    await user.click(
      screen.getByRole("link", { name: "Voir mes recommandations" }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Recommandations" }),
    ).toBeInTheDocument();
  });
});
