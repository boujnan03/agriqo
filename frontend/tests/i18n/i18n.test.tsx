import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Header } from "../../src/components/Header";
import i18n, { LANGUAGES, type Language, resources } from "../../src/i18n";
import { renderRoute, renderWithRouter, TADLA } from "../utils";

type Tree = { [key: string]: string | Tree };

/** "a.b.c" → value, for every leaf of a translation file. */
const flatten = (tree: Tree, prefix = ""): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[`${prefix}${key}`, value]]
        : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );

const files = Object.fromEntries(
  LANGUAGES.map((lng) => [lng, flatten(resources[lng].translation as Tree)]),
) as Record<Language, Record<string, string>>;
const KEYS = Object.keys(files.ar).sort();
const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();

describe("translation files (design.md §9a)", () => {
  it.each(LANGUAGES)("%s.json has exactly the same keys as ar.json", (lng) => {
    expect(Object.keys(files[lng]).sort()).toEqual(KEYS);
  });

  it.each(LANGUAGES)(
    "%s.json: no empty string, same {{placeholders}} as ar.json",
    (lng) => {
      for (const key of KEYS) {
        expect(files[lng][key].trim(), key).not.toBe("");
        expect(placeholders(files[lng][key]), key).toEqual(
          placeholders(files.ar[key]),
        );
      }
    },
  );
});

describe("Arabic default + RTL", () => {
  it("first load is Arabic, right-to-left", () => {
    renderRoute("/farm");
    expect(i18n.language).toBe("ar");
    expect(document.documentElement).toHaveAttribute("lang", "ar");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(
      screen.getByRole("heading", { level: 1, name: "مزرعتك" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AR" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("the switcher changes the visible text, <html lang> and <html dir>", async () => {
    const user = userEvent.setup();
    renderRoute("/farm");
    const html = document.documentElement;
    const h1 = (name: string) =>
      screen.getByRole("heading", { level: 1, name });

    await user.click(screen.getByRole("button", { name: "FR" }));
    expect(h1("Votre ferme")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
    expect(html).toHaveAttribute("lang", "fr");
    expect(html).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("button", { name: "FR" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "EN" }));
    expect(h1("Your farm")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(html).toHaveAttribute("lang", "en");
    expect(html).toHaveAttribute("dir", "ltr");

    await user.click(screen.getByRole("button", { name: "AR" }));
    expect(h1("مزرعتك")).toBeInTheDocument();
    expect(html).toHaveAttribute("lang", "ar");
    expect(html).toHaveAttribute("dir", "rtl");
  });

  it("the Header back arrow points to the reading start: right in Arabic, left in FR/EN", async () => {
    const pathOf = (svg: Element | null | undefined) =>
      svg?.querySelector("path")?.getAttribute("d");
    const reference = (Glyph: typeof ChevronLeft) => {
      const { container, unmount } = render(<Glyph />);
      const d = pathOf(container.querySelector("svg"));
      unmount();
      return d;
    };
    const left = reference(ChevronLeft);
    const right = reference(ChevronRight);
    expect(left).not.toBe(right);

    const backArrow = async (lng: Language) => {
      await i18n.changeLanguage(lng);
      const { unmount } = renderWithRouter(
        <Header variant="drill-in" title="T" backTo="/" backLabel="Back" />,
      );
      const d = pathOf(
        screen.getByRole("link", { name: "Back" }).querySelector("svg"),
      );
      unmount();
      return d;
    };
    expect(await backArrow("ar")).toBe(right);
    expect(await backArrow("fr")).toBe(left);
    expect(await backArrow("en")).toBe(left);
  });
});

/** Every product screen (design.md §7) + Not found, on a fresh session (no parcel picked). */
const SCREENS = [
  "/",
  "/home",
  "/farm",
  "/overview",
  "/recommendations",
  "/crop/ble",
  "/weather",
  "/profile",
  "/nope",
].map((path) => ({ path, parcelPicked: false }));

/** The screens whose content changes once a parcel is picked on Home. */
const PICKED_SCREENS = [
  "/home",
  "/farm",
  "/overview",
  "/weather",
  "/profile",
].map((path) => ({ path, parcelPicked: true }));

describe.each(LANGUAGES)("smoke: every screen renders in %s", (lng) => {
  it.each([...SCREENS, ...PICKED_SCREENS])(
    "$path (parcel picked: $parcelPicked)",
    async ({ path, parcelPicked }) => {
      await i18n.changeLanguage(lng);
      const { container } = renderRoute(path, {
        parcel: parcelPicked ? TADLA : null,
      });

      expect(document.documentElement).toHaveAttribute(
        "dir",
        lng === "ar" ? "rtl" : "ltr",
      );
      // A real title (except Cover: its name is the logo baked into the photo, no heading),
      // and the language switcher reachable on every screen (§9a).
      if (path === "/") {
        expect(screen.queryByRole("heading")).not.toBeInTheDocument();
      } else {
        expect(
          screen.getByRole("heading", { level: 1 }),
        ).not.toBeEmptyDOMElement();
      }
      const switcher = screen.getByRole("group", {
        name: i18n.t("language.label"),
      });
      expect(within(switcher).getAllByRole("button")).toHaveLength(3);

      // No untranslated key leaked into the text or the accessible names.
      const labels = [...container.querySelectorAll("[aria-label]")].map(
        (el) => el.getAttribute("aria-label") ?? "",
      );
      const shown = [container.textContent ?? "", ...labels].join("\n");
      for (const key of KEYS) expect(shown).not.toContain(key);
      expect(shown).not.toMatch(/\{\{|\}\}/);
    },
  );
});
