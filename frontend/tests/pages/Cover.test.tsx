import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import coverField from "../../src/assets/illustrations/cover-field.jpg";
import logoFull from "../../src/assets/logo/logo-full.png";
import i18n, { LANGUAGES } from "../../src/i18n";
import { Cover } from "../../src/pages/Cover";
import {
  inLanguage,
  renderRoute,
  renderWithRouter,
  tabBarLabel,
} from "../utils";

describe("Cover page (design.md §7.1)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("renders the tagline and cover photo, with no separate logo or name", () => {
    const { container } = renderWithRouter(<Cover />);
    const tagline = screen.getByText(
      "Rotation de cultures intelligente pour un avenir durable.",
    );
    // Real asset, not the old labelled placeholder: the label is now the image's alt text.
    expect(
      screen.getByRole("img", { name: "Photo : champ de blé" }),
    ).toHaveAttribute("src", coverField);
    // The logo is baked into the photo: no separate logo image (or its white backing),
    // and no "FieldShift AI" heading, so the photo is the only image and the tagline is
    // the brand block's only child (nothing above it).
    expect(container.querySelector(`img[src="${logoFull}"]`)).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(tagline.parentElement?.children).toHaveLength(1);
  });

  it.each(LANGUAGES)("shows no 'FieldShift AI' text in %s", async (lng) => {
    await i18n.changeLanguage(lng);
    const { container } = renderWithRouter(<Cover />);
    expect(container.textContent).not.toContain("FieldShift");
  });

  it("'Commencer' leads to the farm screen; 'Se connecter' is present", () => {
    renderWithRouter(<Cover />);
    // A navigation action, so a real <a href> (design.md §9), styled as the primary button.
    expect(screen.getByRole("link", { name: "Commencer" })).toHaveAttribute(
      "href",
      "/farm",
    );
    expect(
      screen.getByRole("link", { name: "Se connecter" }),
    ).toBeInTheDocument();
  });

  it("is served at / with no header and no tab bar", () => {
    renderRoute("/");
    expect(screen.getByRole("link", { name: "Commencer" })).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: tabBarLabel() }),
    ).not.toBeInTheDocument();
  });
});
