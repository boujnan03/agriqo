import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FARM_STORAGE_KEY } from "../../src/state/farmStorage";
import {
  deferred,
  fakeBackend,
  fixtures,
  json,
  unreachable,
} from "../fakeBackend";
import { inLanguage, picked, renderRoute, TADLA } from "../utils";

/** The water + climate zone card. */
const waterCard = async () =>
  (
    await screen.findByRole("heading", {
      level: 2,
      name: "Eau et zone climatique",
    })
  ).closest("section") as HTMLElement;

const radio = (name: string) => screen.getByRole("radio", { name });

const text = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\u00a0/g, " ");

describe("Farm: water regime + climate zone (design.md §7 template 3)", () => {
  inLanguage("fr");

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Pluviale by default, labelled as farmer-entered (not NASA data)", async () => {
    renderRoute("/farm", picked);
    const card = await waterCard();
    const group = within(card).getByRole("radiogroup", { name: "Irrigation" });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((r) => r.textContent),
    ).toEqual(["Pluviale", "Irriguée"]);
    expect(radio("Pluviale")).toHaveAttribute("aria-checked", "true");
    expect(
      within(card).getByText(
        "Choix renseigné par vous (pas une donnée NASA) : il adapte les conseils, pas les données.",
      ),
    ).toBeInTheDocument();
  });

  it("the climate zone: the cell centre and ~N km (C057, 0.224° → ~25 km)", async () => {
    renderRoute("/farm", picked);
    const card = await waterCard();
    await waitFor(() =>
      expect(card.querySelector('[data-zone="ok"]')).not.toBeNull(),
    );
    expect(text(card.querySelector('[data-zone="ok"]'))).toBe(
      "Zone climatique NASA POWER :Lat. 32.500·Long. -6.250·~25 km",
    );
    expect(within(card).queryByText("Zone voisine")).toBeNull();
    expect(fakeBackend.seasonCalls[0]).toMatchObject({
      lat: TADLA.lat,
      lon: TADLA.lon,
      water: "pluvial",
    });
  });

  it("switching to Irriguée re-asks the season endpoint with water=irrigue and is remembered", async () => {
    const user = userEvent.setup();
    const { unmount } = renderRoute("/farm", picked);
    await waterCard();
    await waitFor(() => expect(fakeBackend.seasonCalls).toHaveLength(1));

    await user.click(radio("Irriguée"));
    expect(radio("Irriguée")).toHaveAttribute("aria-checked", "true");
    await waitFor(() => expect(fakeBackend.seasonCalls).toHaveLength(2));
    expect(fakeBackend.seasonCalls[1]).toMatchObject({ water: "irrigue" });
    expect(JSON.parse(localStorage.getItem(FARM_STORAGE_KEY) ?? "{}")).toEqual({
      water: "irrigue",
    });

    // A new visit (fresh session) starts from the remembered choice.
    unmount();
    renderRoute("/farm", picked);
    await waterCard();
    expect(radio("Irriguée")).toHaveAttribute("aria-checked", "true");
    await waitFor(() => expect(fakeBackend.seasonCalls).toHaveLength(3));
    expect(fakeBackend.seasonCalls[2]).toMatchObject({ water: "irrigue" });
  });

  it("a superseded request is aborted, and its late answer never replaces the new one", async () => {
    const user = userEvent.setup();
    const first = deferred();
    fakeBackend.respond("seasons", first.responder);
    renderRoute("/farm", picked);
    const card = await waterCard();
    await waitFor(() => expect(fakeBackend.seasonCalls).toHaveLength(1));

    // The second request answers at once (a C113 "proche" answer, to tell them apart)…
    fakeBackend.respond("seasons", json(fixtures.zoneC113Proche));
    await user.click(radio("Irriguée"));
    await waitFor(() =>
      expect(card.querySelector('[data-zone="proche"]')).not.toBeNull(),
    );
    expect(fakeBackend.seasonCalls[0].signal?.aborted).toBe(true);
    expect(fakeBackend.seasonCalls[1].signal?.aborted).toBe(false);

    // …then the first (abandoned) one answers late: ignored.
    first.answer(fixtures.zoneC057);
    await new Promise((r) => setTimeout(r, 20));
    expect(card.querySelector('[data-zone="ok"]')).toBeNull();
    expect(card.querySelector('[data-zone="proche"]')).not.toBeNull();
  });

  it("proche (real C113 answer): the nearby-area badge on the zone line", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneC113Proche));
    renderRoute("/farm", picked);
    const card = await waterCard();
    await waitFor(() =>
      expect(card.querySelector('[data-zone="proche"]')).not.toBeNull(),
    );
    expect(text(card.querySelector('[data-zone="proche"]'))).toBe(
      "Zone climatique NASA POWER :Lat. 35.500·Long. -5.625·~35 kmZone voisine",
    );
  });

  it("hors_zone (real ocean answer): says the parcel is outside the model's area", async () => {
    fakeBackend.respond("seasons", json(fixtures.zoneOcean));
    renderRoute("/farm", picked);
    const card = await waterCard();
    expect(
      await within(card).findByText(
        "Hors de la zone couverte par le modèle de saisons.",
      ),
    ).toBeInTheDocument();
  });

  it("season request failed: a short line on the card, the 4 diagnostic cards unaffected", async () => {
    fakeBackend.respond("seasons", unreachable);
    renderRoute("/farm", picked);
    const card = await waterCard();
    expect(
      await within(card).findByText(
        "Zone climatique non disponible pour le moment.",
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Sol" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("works when localStorage throws (private mode): default regime, the switch still works", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const user = userEvent.setup();
    renderRoute("/farm", picked);
    await waterCard();
    expect(radio("Pluviale")).toHaveAttribute("aria-checked", "true");
    await user.click(radio("Irriguée"));
    expect(radio("Irriguée")).toHaveAttribute("aria-checked", "true");
  });

  it("ignores a stored value that isn't a known regime", async () => {
    localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify({ water: "goutte" }));
    renderRoute("/farm", picked);
    await waterCard();
    expect(radio("Pluviale")).toHaveAttribute("aria-checked", "true");
  });

  it("before any pick: no water card, no season request", () => {
    renderRoute("/farm");
    expect(
      screen.queryByRole("heading", { name: "Eau et zone climatique" }),
    ).toBeNull();
    expect(fakeBackend.seasonCalls).toEqual([]);
  });
});

describe("Farm water card in Arabic (RTL)", () => {
  it("translated labels, Western digits in the zone line", async () => {
    renderRoute("/farm", picked);
    const card = (
      await screen.findByRole("heading", {
        level: 2,
        name: "الماء والمنطقة المناخية",
      })
    ).closest("section") as HTMLElement;
    expect(screen.getByRole("radio", { name: "بعلية" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "مسقية" })).toBeInTheDocument();
    await waitFor(() =>
      expect(card.querySelector('[data-zone="ok"]')).not.toBeNull(),
    );
    const zone = text(card.querySelector('[data-zone="ok"]'));
    expect(zone).toContain("32.500");
    expect(zone).toContain("~25 كم");
    expect(zone).not.toMatch(/[٠-٩۰-۹]/);
  });
});
