import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import i18n from "../../src/i18n";
import { picked, renderRoute } from "../utils";

/**
 * Guard: in English and Arabic, no French may reach the screen — not from a mock fixture, not
 * from a backend free-text field. Every page is rendered with the real captured backend
 * answers (tests/fakeBackend), with and without a drawn parcel, and its visible text plus its
 * accessible names / alt / title texts are checked.
 */

const PAGES = [
  "/",
  "/home",
  "/farm",
  "/overview",
  "/weather",
  "/profile",
  "/recommendations",
  "/crop/ble",
  "/crop/orge",
  "/crop/legumineuses",
  "/nope",
];

/** Latin letters with French accents: none belongs in English or Arabic copy. */
const FRENCH_LETTER = /[àâçéèêëîïôûùüÿœæ]/i;

/**
 * Known French-only words (former fixture text and common French words). Month names are not
 * listed: "Nov – Mar" is also correct English; months are checked by formatting per language.
 */
const FRENCH_WORDS =
  /\b(Blé|Orge|Légumineuses|Élevé|Faible|Moyen|Idéal|Haute adéquation|Béni|pour|avec|votre|vos|données|des|une|sur|dans|les|du)\b/i;

/** Every piece of text a person (or a screen reader) can get from the page. */
function shownTexts(root: HTMLElement): string[] {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = n.textContent?.trim();
    if (s) out.push(s);
  }
  for (const el of root.querySelectorAll("[aria-label],[alt],[title]")) {
    for (const attr of ["aria-label", "alt", "title"]) {
      const s = el.getAttribute(attr)?.trim();
      if (s) out.push(s);
    }
  }
  return out;
}

describe.each(["en", "ar"] as const)("no French text in %s", (lng) => {
  it.each(
    PAGES.flatMap((path) => [
      { path, parcel: true },
      { path, parcel: false },
    ]),
  )("$path (parcel drawn: $parcel)", async ({ path, parcel }) => {
    await i18n.changeLanguage(lng);
    const { container } = renderRoute(path, parcel ? picked : undefined);
    // Wait until every request to the (fake) backend has answered.
    await waitFor(() =>
      expect(
        screen
          .queryAllByRole("status")
          .filter((s) => s.textContent === i18n.t("request.loading")),
      ).toHaveLength(0),
    );
    if (path.startsWith("/crop/") && parcel) {
      await waitFor(() =>
        expect(container.querySelector("p[data-advice]")).not.toBeNull(),
      );
    }
    const offenders = shownTexts(container).filter(
      (s) => FRENCH_LETTER.test(s) || FRENCH_WORDS.test(s),
    );
    expect(offenders).toEqual([]);
  });
});

describe("the guard itself", () => {
  const flagged = (s: string) => FRENCH_LETTER.test(s) || FRENCH_WORDS.test(s);

  it("catches the former French fixture text", () => {
    for (const s of [
      "Blé",
      "Orge",
      "Élevé",
      "Faible à moyen",
      "Moyen",
      "Idéal pour le climat et le type de sol de Béni Mellal.",
      "Oct – Fév",
      "Haute adéquation pour vos conditions",
    ]) {
      expect(flagged(s), s).toBe(true);
    }
  });

  it("does not flag the English or Arabic replacements", () => {
    for (const s of [
      "Wheat",
      "Barley",
      "Low to medium",
      "Nov – Mar",
      "Beni Mellal",
      "From 15 November 2025 to 12 November 2026",
      "القمح",
      "نونبر – مارس",
    ]) {
      expect(flagged(s), s).toBe(false);
    }
  });
});
