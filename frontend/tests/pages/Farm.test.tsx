import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import {
  fakeBackend,
  fixtures,
  json,
  pending,
  unreachable,
} from "../fakeBackend";
import {
  inLanguage,
  picked,
  renderRoute,
  TADLA_REQUEST,
  tabBarLabel,
} from "../utils";

/** The Data card <section> under the h2 named `name`, once the diagnostic has arrived. */
const card = async (name: string) =>
  (await screen.findByRole("heading", { level: 2, name })).closest(
    "section",
  ) as HTMLElement;

/** label → value pairs of a card's fact rows (French non-breaking spaces normalised). */
const rows = (section: HTMLElement) =>
  Object.fromEntries(
    within(section)
      .queryAllByRole("term")
      .map((dt) => [
        dt.textContent,
        dt.nextElementSibling?.textContent?.replace(/\u00a0/g, " "),
      ]),
  );

describe("Farm page (design.md §7.3) with the real backend response", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("asks the backend once, for the picked coordinates, and shows the 4 Data cards in order", async () => {
    const { container } = renderRoute("/farm", picked);
    await card("Sol");
    // The centroid for the point-based sources + the real polygon (GeoJSON) for terrain.
    expect(fakeBackend.calls).toEqual([TADLA_REQUEST]);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["Sol", "Climat", "Humidité", "Relief"]);
    // The drawn parcel: its centroid and size (4 corners of a ~110 m square ≈ 1 ha).
    const main = container.querySelector("main") as HTMLElement;
    expect(main).toHaveTextContent("Centre :Lat. 32.400·Long. -6.450");
    expect(main).toHaveTextContent(/Surface ≈ 1,0\d ha · 4 coins/);
    // Data only: the Header's logo mark is the only image (§7.3, §8).
    expect(container.querySelectorAll("main img")).toHaveLength(0);
  });

  it("each ok card shows the response's real values, its caveat and its own source", async () => {
    renderRoute("/farm", picked);

    const soil = await card("Sol");
    expect(rows(soil)).toEqual({
      Texture: "Franco-argileuse",
      pH: "7,4",
      "Carbone organique": "14,2 g/kg",
    });
    expect(
      within(soil).getByText(
        "Estimation (~250 m), pas une analyse de laboratoire.",
      ),
    ).toBeInTheDocument();
    expect(
      within(soil).getByText("Données : ISRIC SoilGrids"),
    ).toBeInTheDocument();

    const climate = await card("Climat");
    expect(rows(climate)).toEqual({
      "Température moyenne": "17,9 °C",
      "Température max. moyenne": "31,5 °C",
      "Pluie annuelle": "526 mm/an",
      "Jours de gel (12 derniers mois)": "4",
    });
    expect(
      within(climate).getByText("Données : NASA POWER"),
    ).toBeInTheDocument();

    const moisture = await card("Humidité");
    // GWETTOP 0.49 → 49 %; the label is the backend's own classification.
    expect(rows(moisture)).toEqual({
      "Humidité du sol en surface": "49 %",
      Niveau: "Moyen",
    });
    expect(
      within(moisture).getByText(
        "Valeur du 2026-11-12 (les données ont quelques jours de retard).",
      ),
    ).toBeInTheDocument();
  });

  it("Relief: the backend says indisponible (missing_api_key) → the fallback text, its source, no number", async () => {
    renderRoute("/farm", picked);
    const relief = await card("Relief");
    expect(relief).toHaveAttribute("data-status", "indisponible");
    expect(relief).toHaveAttribute("data-error", "missing_api_key");
    expect(within(relief).getByText("Donnée indisponible")).toBeInTheDocument();
    expect(
      within(relief).getByText("Données : OpenTopography"),
    ).toBeInTheDocument();
    expect(rows(relief)).toEqual({});
    expect(relief.textContent).not.toMatch(/\d/);
  });

  it("pas_de_donnees (real ocean response): the soil card's specific reason, the other cards still shown", async () => {
    fakeBackend.respond("diagnostic", json(fixtures.diagnosticOcean));
    renderRoute("/farm", picked);
    const soil = await card("Sol");
    expect(soil).toHaveAttribute("data-status", "pas_de_donnees");
    expect(
      within(soil).getByText(
        "Pas de données de sol ici. Vérifiez que le point est sur une terre agricole.",
      ),
    ).toBeInTheDocument();
    expect(await card("Climat")).toHaveAttribute("data-status", "ok");
  });

  it("a null value inside an ok block is shown as missing, never as 0", async () => {
    const climate = { ...fixtures.diagnosticTadla.climate, frost_days: null };
    fakeBackend.respond(
      "diagnostic",
      json({ ...fixtures.diagnosticTadla, climate }),
    );
    renderRoute("/farm", picked);
    expect(rows(await card("Climat"))["Jours de gel (12 derniers mois)"]).toBe(
      "Non disponible",
    );
  });

  it("while the request is in flight: one loading state, no Data cards", () => {
    fakeBackend.respond("diagnostic", pending);
    renderRoute("/farm", picked);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement des données de votre parcelle…",
    );
    expect(screen.queryByRole("heading", { name: "Sol" })).toBeNull();
  });

  it.each([
    ["unreachable", unreachable],
    ["HTTP 500", json({ detail: "boom" }, 500)],
  ])(
    "our backend %s: a distinct error state (not 4 'indisponible' cards), then retry works",
    async (_, failure) => {
      const user = userEvent.setup();
      fakeBackend.respond("diagnostic", failure);
      renderRoute("/farm", picked);

      const alert = await screen.findByRole("alert");
      expect(
        within(alert).getByRole("heading", { name: "Serveur injoignable" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("Donnée indisponible")).toBeNull();
      expect(screen.queryByRole("heading", { name: "Sol" })).toBeNull();

      fakeBackend.respond("diagnostic", json(fixtures.diagnosticTadla));
      await user.click(screen.getByRole("button", { name: "Réessayer" }));
      expect(await card("Sol")).toHaveAttribute("data-status", "ok");
      expect(fakeBackend.calls).toHaveLength(2);
    },
  );

  it("before any pick: a short empty state pointing back to Home, and no request at all", () => {
    renderRoute("/farm");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Aucune parcelle choisie",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Choisir ma parcelle" }),
    ).toHaveAttribute("href", "/home");
    expect(screen.queryByRole("heading", { name: "Sol" })).toBeNull();
    expect(fakeBackend.calls).toEqual([]);
  });

  it("is a tab-bar root: title-only header, Farm tab active", () => {
    renderRoute("/farm");
    expect(within(screen.getByRole("banner")).queryByRole("link")).toBeNull();
    const tabBar = screen.getByRole("navigation", { name: tabBarLabel() });
    // Tab mapping (design.md §6): /farm is the "Farm" tab ("Ferme" in French).
    expect(within(tabBar).getByRole("link", { name: "Ferme" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

describe.each(LANGUAGES)("Farm page in %s", (lng) => {
  inLanguage(lng);

  it("renders every string translated, with Western digits", async () => {
    const { container } = renderRoute("/farm", picked);
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    await screen.findByRole("heading", { level: 2, name: i18n.t("farm.soil") });
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(
      ["soil", "climate", "humidity", "relief"].map((k) =>
        i18n.t(`farm.${k}` as "farm.soil"),
      ),
    );
    expect(
      screen.getByText(i18n.t("dataCard.unavailable")),
    ).toBeInTheDocument();
    const text = container.textContent ?? "";
    expect(text).toContain("526");
    expect(text).not.toMatch(/[٠-٩۰-۹]/);
    expect(text).not.toMatch(/\b(farm|data|units|dataCard|request)\.|\{\{/);
  });
});
