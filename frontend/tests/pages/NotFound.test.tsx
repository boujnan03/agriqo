import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotFound } from "../../src/pages/NotFound";
import { TAB_BAR_LABEL } from "../../src/router/tabs";
import { renderRoute, renderWithRouter } from "../utils";

describe("Not found page (design.md §7.6)", () => {
  it("shows the message and a button back to the Cover screen", () => {
    renderWithRouter(<NotFound />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Page introuvable." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Retour à l'accueil" }),
    ).toHaveAttribute("href", "/");
  });

  it("is the catch-all for unmatched paths, with no header and no tab bar", () => {
    renderRoute("/nope");
    expect(
      screen.getByRole("heading", { level: 1, name: "Page introuvable." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: TAB_BAR_LABEL }),
    ).not.toBeInTheDocument();
  });
});
