import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import i18n from "../../src/i18n";
import { fakeBackend, fixtures, json } from "../fakeBackend";
import { inLanguage, picked, renderRoute, TADLA } from "../utils";

const norm = (s: string | null | undefined) =>
  (s ?? "").replace(/\u00a0/g, " ");

/** The "Pourquoi ce choix ?" box. */
const whyBox = () =>
  screen
    .getByRole("heading", { level: 3, name: "Pourquoi ce choix ? Exemple" })
    .closest("section") as HTMLElement;

/** Real climate paragraphs in the box, in order. */
const climate = (box: HTMLElement) =>
  [...box.querySelectorAll("p[data-advice]")].map((p) => ({
    id: p.getAttribute("data-advice"),
    text: norm(p.textContent),
  }));

const DROUGHT =
  "Climat de votre zone : Privilégiez des cultures tolérantes à la sécheresse (orge, pois chiche, lentille) et des variétés à cycle court. Pourquoi : saisons sèches et chaudes : 9 sur 10 (de 2015–2016 à 2024–2025).";
const HOT =
  "Climat de votre zone : Semez tôt et choisissez des variétés précoces, pour finir le remplissage du grain avant la chaleur. Pourquoi : jours > 30 °C (mars–mai) au-dessus de la normale 8 fois sur 10 ; moyenne 16,8, normale 12,6.";

describe("Crop detail: 'Climat de votre zone' from the real C057 advice (spec §7.7)", () => {
  inLanguage("fr");

  it.each([
    [
      "orge",
      [
        { id: "drought_tolerant", text: DROUGHT },
        { id: "hot_spring", text: HOT },
      ],
    ],
    ["legumineuses", [{ id: "drought_tolerant", text: DROUGHT }]],
    ["ble", [{ id: "hot_spring", text: HOT }]],
  ])(
    "/crop/%s adds a paragraph for each advice naming this crop",
    async (id, expected) => {
      renderRoute(`/crop/${id}`, picked);
      const box = whyBox();
      await waitFor(() => expect(climate(box)).toEqual(expected));
      // The mock text is still there, marked "Exemple".
      expect(
        within(box).getByText(i18n.t(`crops.${id as "orge"}.why`)),
      ).toBeInTheDocument();
      expect(norm(box.textContent)).toContain(
        "Source : NASA POWER, normale 1996–2025 de votre zone. À valider par un agronome",
      );
      expect(fakeBackend.seasonCalls[0]).toMatchObject({
        lat: TADLA.lat,
        lon: TADLA.lon,
      });
    },
  );

  it("the irrigated variant is used when the farmer chose it", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneC057Irrigue));
    renderRoute("/crop/legumineuses", { ...picked, water: "irrigue" });
    const box = whyBox();
    await waitFor(() => expect(climate(box)).toHaveLength(1));
    expect(climate(box)[0].text).toBe(
      "Climat de votre zone : Avec l'irrigation, la sécheresse pèse moins, mais prévoyez des restrictions d'eau d'irrigation les années sèches. Pourquoi : saisons sèches et chaudes : 9 sur 10 (de 2015–2016 à 2024–2025).",
    );
    expect(fakeBackend.seasonCalls[0]).toMatchObject({ water: "irrigue" });
  });

  it("no advice for the zone (real C113 answer): nothing added", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneC113Proche));
    renderRoute("/crop/orge", picked);
    await waitFor(() => expect(fakeBackend.seasonCalls).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 20));
    const box = whyBox();
    expect(climate(box)).toEqual([]);
    expect(box.textContent).not.toContain("Climat de votre zone");
    expect(box.textContent).not.toContain("À valider par un agronome");
  });

  it("outside the covered area (real ocean answer): nothing added", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneOcean));
    renderRoute("/crop/orge", picked);
    await waitFor(() => expect(fakeBackend.seasonCalls).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(climate(whyBox())).toEqual([]);
  });

  it("before any pick: only the mock text, no season request", () => {
    renderRoute("/crop/orge");
    expect(climate(whyBox())).toEqual([]);
    expect(fakeBackend.seasonCalls).toEqual([]);
  });
});

describe("Crop detail climate paragraph in Arabic", () => {
  it("translated, Western digits only", async () => {
    const { container } = renderRoute("/crop/orge", picked);
    await waitFor(() =>
      expect(container.querySelectorAll("p[data-advice]")).toHaveLength(2),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("مناخ منطقتك:");
    expect(text).toContain("يجب أن يتحقق منه مهندس زراعي");
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
  });
});
