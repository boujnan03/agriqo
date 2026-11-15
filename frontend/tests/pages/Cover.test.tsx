import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import coverField from "../../src/assets/illustrations/cover-field.jpg";
import logoFull from "../../src/assets/logo/logo-full.png";
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

  it("renders the app name, tagline and cover photo, with no separate logo", () => {
    const { container } = renderWithRouter(<Cover />);
    expect(
      screen.getByRole("heading", { level: 1, name: "FieldShift AI" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Rotation de cultures intelligente pour un avenir durable.",
      ),
    ).toBeInTheDocument();
    // Real asset, not the old labelled placeholder: the label is now the image's alt text.
    expect(
      screen.getByRole("img", { name: "Photo : champ de blé" }),
    ).toHaveAttribute("src", coverField);
    // The logo is baked into the photo: no separate logo image (or its white backing),
    // so the photo is the only image and the heading is the brand block's first child.
    expect(container.querySelector(`img[src="${logoFull}"]`)).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(1);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.parentElement?.firstElementChild).toBe(heading);
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
    expect(
      screen.getByRole("heading", { level: 1, name: "FieldShift AI" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: tabBarLabel() }),
    ).not.toBeInTheDocument();
  });
});
