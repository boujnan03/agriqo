import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { describe, expect, expectTypeOf, it } from "vitest";

import i18n, { LANGUAGES, type Language } from "../../src/i18n";
import { profileData } from "../../src/mocks/profile";
import type { ProfileData } from "../../src/types/profile";
import { inLanguage, renderRoute, tabBarLabel } from "../utils";

const languageRow = () => screen.getByRole("button", { name: /^Lang|^اللغة/ });

describe("Profile page (design.md §7 template 8)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("the mock fixture matches the ProfileData type", () => {
    // Type-level check: enforced by `npm run typecheck`.
    expectTypeOf(profileData).toEqualTypeOf<ProfileData>();
  });

  it("shows the profile summary", () => {
    renderRoute("/profile");
    expect(
      screen.getByRole("heading", { level: 1, name: "Profil" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: profileData.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(profileData.location)).toBeInTheDocument();
    expect(screen.getByText("Membre depuis 2026")).toBeInTheDocument();
  });

  it("lists the 3 settings with their initial values", () => {
    renderRoute("/profile");
    expect(languageRow()).toHaveTextContent("Langue Français");
    const notifications = screen.getByRole("switch", { name: /Notifications/ });
    expect(notifications).toHaveTextContent("Activées");
    expect(notifications).toBeChecked();
    expect(screen.getByRole("button", { name: /Unités/ })).toHaveTextContent(
      "Métrique",
    );
  });

  it("tapping Notifications toggles its value (local state only)", async () => {
    const user = userEvent.setup();
    renderRoute("/profile");
    const notifications = screen.getByRole("switch", { name: /Notifications/ });
    await user.click(notifications);
    expect(notifications).toHaveTextContent("Désactivées");
    expect(notifications).not.toBeChecked();
    await user.click(notifications);
    expect(notifications).toHaveTextContent("Activées");
    expect(notifications).toBeChecked();
  });

  it("tapping Units only says more units are coming", async () => {
    const user = userEvent.setup();
    renderRoute("/profile");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.click(screen.getByRole("button", { name: /Unités/ }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "D'autres unités seront bientôt disponibles.",
    );
    expect(screen.getByRole("button", { name: /Unités/ })).toHaveTextContent(
      "Métrique",
    );
  });

  it("the language row and the Header switcher drive the same language", async () => {
    const user = userEvent.setup();
    renderRoute("/profile");
    const pressed = () =>
      within(screen.getByRole("banner"))
        .getAllByRole("button")
        .find((b) => b.getAttribute("aria-pressed") === "true")?.textContent;

    // Row → cycles FR → EN; the Header switcher follows.
    await user.click(languageRow());
    expect(i18n.language).toBe("en");
    expect(languageRow()).toHaveTextContent("Language English");
    expect(pressed()).toBe("EN");
    expect(
      screen.getByRole("heading", { level: 1, name: "Profile" }),
    ).toBeInTheDocument();

    // Row again → EN → AR (wraps), right-to-left.
    await user.click(languageRow());
    expect(languageRow()).toHaveTextContent("اللغة العربية");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(pressed()).toBe("AR");

    // Header switcher → the row follows.
    await user.click(screen.getByRole("button", { name: "FR" }));
    expect(languageRow()).toHaveTextContent("Langue Français");
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
  });

  it("'Se déconnecter' clears the demo session and returns to the Cover login gate", async () => {
    const user = userEvent.setup();
    renderRoute("/profile", { signedIn: true });
    await user.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(
      await screen.findByRole("form", { name: "Connexion" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("is a tab-bar root: Profile tab enabled and active, header without back arrow", () => {
    renderRoute("/profile");
    const tabBar = screen.getByRole("navigation", { name: tabBarLabel() });
    expect(
      within(tabBar).getByRole("link", { name: "Profil" }),
    ).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("banner")).queryByRole("link")).toBeNull();
  });

  it("the Profile tab is reachable from another tab-bar screen", async () => {
    const user = userEvent.setup();
    renderRoute("/farm");
    await user.click(screen.getByRole("link", { name: "Profil" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Profil" }),
    ).toBeInTheDocument();
  });
});

describe.each(LANGUAGES)("Profile page in %s", (lng) => {
  inLanguage(lng);

  it("renders every string translated", () => {
    const { container } = renderRoute("/profile");
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    expect(
      screen.getByRole("heading", { level: 1, name: i18n.t("profile.title") }),
    ).toBeInTheDocument();
    expect(languageRow()).toHaveTextContent(i18n.t("profile.currentLanguage"));
    expect(
      screen.getByText(i18n.t("profile.memberSince", { year: "2026" })),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: i18n.t("profile.signOut") }),
    ).toBeInTheDocument();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\bprofile\.|\{\{/); // no leaked key or placeholder
  });
});

describe("Profile setting rows in RTL (design.md §9a)", () => {
  const pathOf = (svg: Element | null | undefined) =>
    svg?.querySelector("path")?.getAttribute("d");
  const reference = (Glyph: typeof ChevronLeft) => {
    const { container, unmount } = render(<Glyph />);
    const d = pathOf(container.querySelector("svg"));
    unmount();
    return d;
  };

  /** Path of every row's trailing chevron, rendered in `lng`. */
  const rowChevrons = async (lng: Language) => {
    await i18n.changeLanguage(lng);
    const { container, unmount } = renderRoute("/profile");
    const paths = [...container.querySelectorAll("[data-chevron] svg")].map(
      pathOf,
    );
    unmount();
    return paths;
  };

  it("row chevrons point forward: left in Arabic, right in French/English", async () => {
    const left = reference(ChevronLeft);
    const right = reference(ChevronRight);
    expect(await rowChevrons("ar")).toEqual([left, left, left]);
    expect(await rowChevrons("fr")).toEqual([right, right, right]);
    expect(await rowChevrons("en")).toEqual([right, right, right]);
  });
});
