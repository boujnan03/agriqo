import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import coverField from "../../src/assets/illustrations/cover-field.jpg";
import logoFull from "../../src/assets/logo/logo-full.png";
import { checkCredentials, SEED_ACCOUNT } from "../../src/auth/seedAccount";
import i18n, { LANGUAGES } from "../../src/i18n";
import { Cover } from "../../src/pages/Cover";
import {
  inLanguage,
  renderRoute,
  renderWithRouter,
  tabBarLabel,
} from "../utils";

/** Fill the Cover login form and submit it. */
async function signIn(username: string, password: string) {
  const user = userEvent.setup();
  const form = screen.getByRole("form", { name: i18n.t("cover.loginForm") });
  if (username)
    await user.type(
      within(form).getByLabelText(i18n.t("cover.username")),
      username,
    );
  if (password)
    await user.type(
      within(form).getByLabelText(i18n.t("cover.password")),
      password,
    );
  await user.click(
    within(form).getByRole("button", { name: i18n.t("cover.signIn") }),
  );
}

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

  it("shows the login gate: labelled username + password fields and one primary button", () => {
    renderWithRouter(<Cover />);
    const form = screen.getByRole("form", { name: "Connexion" });
    expect(within(form).getByLabelText("Nom d'utilisateur")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    expect(within(form).getByLabelText("Mot de passe")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      within(form).getByRole("button", { name: "Se connecter" }),
    ).toHaveAttribute("type", "submit");
    // The gate replaced the old shortcut past Cover.
    expect(
      screen.queryByRole("link", { name: "Commencer" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("the seeded demo account signs in and opens Home", async () => {
    renderRoute("/");
    await signIn(SEED_ACCOUNT.username, SEED_ACCOUNT.password);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Accueil" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["wrong password", SEED_ACCOUNT.username, "nope"],
    ["unknown user", "someone", SEED_ACCOUNT.password],
    ["empty fields", "", ""],
  ])("%s: stays on Cover with a plain inline error", async (_, u, p) => {
    renderRoute("/");
    await signIn(u, p);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Nom d'utilisateur ou mot de passe incorrect.",
    );
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("checkCredentials: exact match, username trimmed", () => {
    expect(checkCredentials(" demo ", SEED_ACCOUNT.password)).toBe(true);
    expect(checkCredentials("Demo", SEED_ACCOUNT.password)).toBe(false);
    expect(checkCredentials("demo", ` ${SEED_ACCOUNT.password}`)).toBe(false);
  });

  it("is served at / with no header and no tab bar", () => {
    renderRoute("/");
    expect(screen.getByRole("form", { name: "Connexion" })).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: tabBarLabel() }),
    ).not.toBeInTheDocument();
  });
});

describe.each(LANGUAGES)("Cover login gate in %s", (lng) => {
  inLanguage(lng);

  it("rejects wrong credentials with the translated message", async () => {
    renderRoute("/");
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    await signIn("x", "y");
    expect(screen.getByRole("alert")).toHaveTextContent(
      i18n.t("cover.loginError"),
    );
  });
});
