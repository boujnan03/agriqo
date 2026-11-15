import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import {
  fakeBackend,
  fixtures,
  json,
  seasonsByWater,
  unreachable,
} from "../fakeBackend";
import { inLanguage, picked, renderRoute } from "../utils";

const CLIMATE = "Ce que dit le climat de votre zone";
const SOURCE = "Source : NASA POWER, normale 1996–2025 de votre zone.";
const VALIDATE = "À valider par un agronome";

const norm = (s: string | null | undefined) =>
  (s ?? "").replace(/\u00a0/g, " ");

/** The climate-advice <section>, once its title is on screen. */
const climateSection = async () =>
  (await screen.findByRole("heading", { level: 2, name: CLIMATE })).closest(
    "section",
  ) as HTMLElement;

/** Advice cards in DOM order: id + their 3 lines. */
const cards = (root: ParentNode = document) =>
  [...root.querySelectorAll("article[data-advice]")].map((card) => {
    const [text, why, meta] = [...card.querySelectorAll("p")].map((p) =>
      norm(p.textContent),
    );
    return { id: card.getAttribute("data-advice"), text, why, meta };
  });

/** C057 (Tadla), water=pluvial: the 4 advice cards, every number from the evidence. */
const C057_PLUVIAL = [
  {
    id: "drought_tolerant",
    text: "Privilégiez des cultures tolérantes à la sécheresse (orge, pois chiche, lentille) et des variétés à cycle court.",
    why: "Pourquoi : saisons sèches et chaudes : 9 sur 10 (de 2015–2016 à 2024–2025).",
  },
  {
    id: "dry_autumn",
    text: "Ne semez pas sur sol sec : attendez la première pluie utile.",
    why: "Pourquoi : pluie d'octobre à décembre sous la normale 8 fois sur 10 ; 111,3 mm contre 189,9 mm (59 %).",
  },
  {
    id: "hot_spring",
    text: "Semez tôt et choisissez des variétés précoces, pour finir le remplissage du grain avant la chaleur.",
    why: "Pourquoi : jours > 30 °C (mars–mai) au-dessus de la normale 8 fois sur 10 ; moyenne 16,8, normale 12,6.",
  },
  {
    id: "last_season_dry",
    text: "Les réserves d'eau du sol sont probablement basses : prudence avec les intrants coûteux.",
    why: "Pourquoi : saison 2024–2025 : 370,6 mm, soit 81 % de la normale (458,6 mm).",
  },
];

describe("Recommendations: what your area's climate says (real C057 advice)", () => {
  inLanguage("fr");

  it("one Advice card per advice, in API order, field_shift left to Insights", async () => {
    renderRoute("/recommendations", picked);
    const section = await climateSection();
    await within(section).findAllByRole("article");
    expect(
      cards(section).map(({ id, text, why }) => ({ id, text, why })),
    ).toEqual(C057_PLUVIAL);
    expect(section.querySelector('[data-advice="field_shift"]')).toBeNull();
  });

  it("every card names its source and says 'À valider par un agronome'", async () => {
    renderRoute("/recommendations", picked);
    const section = await climateSection();
    await within(section).findAllByRole("article");
    for (const card of cards(section)) {
      expect(card.meta).toBe(`${SOURCE}${VALIDATE}`);
    }
  });

  it("says which water regime the advice is for, with a link to change it on Farm", async () => {
    renderRoute("/recommendations", picked);
    const section = await climateSection();
    expect(
      await within(section).findByText("Conseils pour une parcelle pluviale."),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: "Changer dans Ferme" }),
    ).toHaveAttribute("href", "/farm");
  });

  it("irrigated: the backend's irrigue variant changes the wording (Farm → Insights → Recommendations)", async () => {
    const user = userEvent.setup();
    fakeBackend.respond("seasons", seasonsByWater);
    renderRoute("/farm", picked);
    await user.click(await screen.findByRole("radio", { name: "Irriguée" }));
    await user.click(screen.getByRole("link", { name: "Analyses" }));
    await user.click(
      await screen.findByRole("link", { name: "Voir mes recommandations" }),
    );
    const section = await climateSection();
    await within(section).findAllByRole("article");
    const byId = Object.fromEntries(cards(section).map((c) => [c.id, c.text]));
    expect(byId).toEqual({
      drought_tolerant:
        "Avec l'irrigation, la sécheresse pèse moins, mais prévoyez des restrictions d'eau d'irrigation les années sèches.",
      dry_autumn: "Prévoyez une irrigation d'installation après le semis.",
      // Same text in both regimes.
      hot_spring: C057_PLUVIAL[2].text,
      last_season_dry:
        "Vérifiez vos dotations d'eau d'irrigation avant de choisir vos cultures.",
    });
    expect(
      within(section).getByText("Conseils pour une parcelle irriguée."),
    ).toBeInTheDocument();
    // The reasons (the numbers) do not depend on the regime.
    expect(cards(section).map((c) => c.why)).toEqual(
      C057_PLUVIAL.map((c) => c.why),
    );
  });

  it("the crop ranking stays, clearly marked 'Exemple'", async () => {
    renderRoute("/recommendations", picked);
    const ranking = screen
      .getByRole("heading", { level: 2, name: "Cultures Exemple" })
      .closest("section") as HTMLElement;
    expect(
      within(ranking).getByText(
        "Classement d'exemple : pas encore calculé à partir de vos données.",
      ),
    ).toBeInTheDocument();
    expect(
      within(ranking).getByRole("link", {
        name: "Meilleure culture pour vous Blé",
      }),
    ).toBeInTheDocument();
    expect(
      within(ranking).getByRole("link", { name: "Orge 85%" }),
    ).toBeInTheDocument();
    expect(
      within(ranking).getByRole("link", { name: "Légumineuses 82%" }),
    ).toBeInTheDocument();
    expect(
      within(ranking).getByRole("list", {
        name: "Plan de rotation des cultures",
      }),
    ).toBeInTheDocument();
    // The advice cards are outside the ranking (and not featured).
    await climateSection();
    expect(ranking.querySelector("[data-advice]")).toBeNull();
  });

  it("no advice (real C113 proche answer): the 'zone voisine' reminder and the plain empty line", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneC113Proche));
    renderRoute("/recommendations", picked);
    const section = await climateSection();
    expect(
      norm(
        (await within(section).findByText(/Aucun signal climatique/))
          .textContent,
      ),
    ).toBe(
      "Aucun signal climatique marqué dans votre zone de 2015–2016 à 2024–2025.",
    );
    expect(
      norm(section.querySelector('[data-zone="proche"]')?.textContent),
    ).toBe(
      "Zone voisine : votre parcelle est juste hors des cellules couvertes ; ces données sont celles de la cellule la plus proche (~35 km).",
    );
    expect(cards(section)).toEqual([]);
  });

  it("hors_zone (real ocean answer): a short message and a way back to Home", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneOcean));
    renderRoute("/recommendations", picked);
    const section = await climateSection();
    expect(
      await within(section).findByText(
        "Votre parcelle est hors de la zone couverte (Maroc, au nord de 29,5° N). Cellule la plus proche à ~85 km.",
      ),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: "Choisir une autre parcelle" }),
    ).toHaveAttribute("href", "/home");
    expect(cards(section)).toEqual([]);
  });

  it("our backend unreachable: an error with Réessayer, which brings the cards", async () => {
    const user = userEvent.setup();
    fakeBackend.respond("seasons", unreachable);
    renderRoute("/recommendations", picked);
    const alert = await screen.findByRole("alert");
    fakeBackend.respond("seasons", json(fixtures.zoneC057));
    await user.click(within(alert).getByRole("button", { name: "Réessayer" }));
    expect(await screen.findAllByRole("article")).toHaveLength(4);
  });

  it("before any pick: the no-parcel card, no season request; the ranking is still there", () => {
    renderRoute("/recommendations");
    expect(
      screen.getByRole("heading", { name: "Aucune parcelle choisie" }),
    ).toBeInTheDocument();
    expect(fakeBackend.seasonCalls).toEqual([]);
    expect(
      screen.getByRole("heading", { level: 2, name: "Cultures Exemple" }),
    ).toBeInTheDocument();
  });

  it("shares ONE season request with Insights and the crop page (no refetch per page)", async () => {
    const user = userEvent.setup();
    renderRoute("/overview", picked);
    await screen.findByRole("heading", {
      name: "Dernière saison disponible : 2024–2025",
    });
    await user.click(
      screen.getByRole("link", { name: "Voir mes recommandations" }),
    );
    expect(await screen.findAllByRole("article")).toHaveLength(4);
    await user.click(screen.getByRole("link", { name: "Orge 85%" }));
    await screen.findByRole("heading", { level: 2, name: "Orge" });
    expect(document.querySelectorAll("p[data-advice]")).toHaveLength(2);
    expect(fakeBackend.seasonCalls).toHaveLength(1);
  });
});

describe("Recommendations advice in Arabic (RTL)", () => {
  it("right-to-left, Western digits only, the agronomist caveat on each card", async () => {
    const { container } = renderRoute("/recommendations", picked);
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    await screen.findByRole("heading", {
      level: 2,
      name: "ما يقوله مناخ منطقتك",
    });
    expect(await screen.findAllByRole("article")).toHaveLength(4);
    expect(screen.getAllByText("يجب أن يتحقق منه مهندس زراعي")).toHaveLength(4);
    const text = container.textContent ?? "";
    expect(text).toContain("2024–2025");
    expect(text).toContain("370,6");
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
  });
});

describe.each(LANGUAGES)("Recommendations advice in %s", (lng) => {
  inLanguage(lng);

  it("every string translated, no key or placeholder leaked", async () => {
    const { container } = renderRoute("/recommendations", picked);
    expect(await screen.findAllByRole("article")).toHaveLength(4);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: i18n.t("recommendations.climateTitle"),
      }),
    ).toBeInTheDocument();
    const shown = container.textContent ?? "";
    expect(shown).not.toMatch(/\b(advice|recommendations|common)\.|\{\{|\}\}/);
    expect(shown).not.toMatch(/[٠-٩۰-۹]/);
  });
});
