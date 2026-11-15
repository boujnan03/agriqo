import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import { fakeBackend, unreachable } from "../fakeBackend";
import { inLanguage, picked, renderRoute, tabBarLabel } from "../utils";

/** The Leaflet map element inside Home's map region. */
const leafletMap = () =>
  screen
    .getByRole("region", { name: i18n.t("home.mapLabel") })
    .querySelector(".leaflet-container") as HTMLElement;

describe("Home page (design.md §7.2)", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("before a pick: a real Leaflet map with OpenStreetMap tiles, no summary or CTA yet", () => {
    renderRoute("/home");
    expect(
      screen.getByRole("heading", { level: 1, name: "Accueil" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Touchez la carte à l'endroit de votre parcelle."),
    ).toBeInTheDocument();
    expect(leafletMap()).toBeInTheDocument();
    // OSM's required attribution is shown (tile usage policy).
    expect(screen.getByRole("link", { name: "OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    // No illustration standing in for the map any more.
    expect(screen.queryByRole("img", { name: /Carte/ })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Parcelle sélectionnée" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Voir le diagnostic complet" }),
    ).not.toBeInTheDocument();
  });

  it("tapping the map drops a pin and shows the real coordinates of that point", async () => {
    renderRoute("/home");
    // jsdom has no layout (a 0×0 map), so a tap at the origin lands on the map centre, which
    // starts on the Tadla plain (32.4, -6.45).
    fireEvent.click(leafletMap(), { clientX: 0, clientY: 0 });

    const summary = (
      await screen.findByRole("heading", {
        level: 2,
        name: "Parcelle sélectionnée",
      })
    ).closest("section") as HTMLElement;
    expect(summary).toHaveTextContent("Lat. 32.400");
    expect(summary).toHaveTextContent("Long. -6.450");
    // The pin is drawn on the map (a vector circle: no marker image to load).
    expect(
      leafletMap().querySelector("path.leaflet-interactive"),
    ).not.toBeNull();
    expect(
      screen.getByText(
        "Touchez ailleurs sur la carte pour déplacer le repère.",
      ),
    ).toBeInTheDocument();
  });

  it("the pin goes where the map is tapped: east and south of the centre → larger lon, smaller lat", async () => {
    renderRoute("/home");
    fireEvent.click(leafletMap(), { clientX: 120, clientY: 80 });
    const summary = (
      await screen.findByRole("heading", {
        level: 2,
        name: "Parcelle sélectionnée",
      })
    ).closest("section") as HTMLElement;
    const [lat, lon] = [...summary.querySelectorAll("bdi")].map((b) =>
      Number(b.textContent),
    );
    expect(lon).toBeGreaterThan(-6.45);
    expect(lat).toBeLessThan(32.4);
    expect(lat).toBeGreaterThan(31); // still on the Tadla plain, not a garbage value
  });

  it("keyboard alternative: a real button picks the centre of the map (§9)", async () => {
    const user = userEvent.setup();
    renderRoute("/home");
    await user.click(
      screen.getByRole("button", { name: "Choisir le centre de la carte" }),
    );
    const summary = screen
      .getByRole("heading", { level: 2, name: "Parcelle sélectionnée" })
      .closest("section") as HTMLElement;
    expect(summary).toHaveTextContent("Lat. 32.400");
    expect(summary).toHaveTextContent("Long. -6.450");
  });

  it("after a pick: 2 headline facts from the REAL diagnostic for that point, with their sources", async () => {
    const user = userEvent.setup();
    renderRoute("/home");
    await user.click(
      screen.getByRole("button", { name: "Choisir le centre de la carte" }),
    );
    const summary = screen
      .getByRole("heading", { level: 2, name: "Parcelle sélectionnée" })
      .closest("section") as HTMLElement;
    expect(
      await within(summary).findByText("Franco-argileuse"),
    ).toBeInTheDocument();
    // jsdom's map centre is 32.4 / -6.45 up to float noise.
    expect(fakeBackend.calls).toHaveLength(1);
    expect(fakeBackend.calls[0].route).toBe("diagnostic");
    expect(fakeBackend.calls[0].lat).toBeCloseTo(32.4, 6);
    expect(fakeBackend.calls[0].lon).toBeCloseTo(-6.45, 6);
    expect(
      within(summary)
        .getAllByRole("term")
        .map((dt) => dt.textContent),
    ).toEqual(["Texture du sol", "Pluie annuelle"]);
    expect(summary.textContent?.replace(/\u00a0/g, " ")).toContain("526 mm/an");
    expect(
      within(summary).getByText("Données : ISRIC SoilGrids · NASA POWER"),
    ).toBeInTheDocument();
  });

  it("backend unreachable after a pick: the request error state, coordinates still shown", async () => {
    fakeBackend.respond("diagnostic", unreachable);
    renderRoute("/home", picked);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Serveur injoignable",
    );
    expect(screen.getByText("32.400")).toBeInTheDocument();
  });

  it("'Voir le diagnostic complet' is the one CTA and opens Farm for the same parcel", async () => {
    const user = userEvent.setup();
    renderRoute("/home", picked);
    const cta = screen.getByRole("link", {
      name: "Voir le diagnostic complet",
    });
    expect(cta).toHaveAttribute("href", "/farm");
    await user.click(cta);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Votre ferme" }),
    ).toBeInTheDocument();
    await screen.findByRole("heading", { level: 2, name: "Sol" });
    // Home and Farm share one diagnostic request for the same point.
    expect(fakeBackend.calls).toHaveLength(1);
  });

  it("is a tab-bar root: title-only header, Home tab active", () => {
    renderRoute("/home");
    expect(within(screen.getByRole("banner")).queryByRole("link")).toBeNull();
    const tabBar = screen.getByRole("navigation", { name: tabBarLabel() });
    expect(
      within(tabBar).getByRole("link", { name: "Accueil" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

describe.each(LANGUAGES)("Home page in %s", (lng) => {
  inLanguage(lng);

  it("renders every string translated; the map itself stays left-to-right", async () => {
    const user = userEvent.setup();
    const { container } = renderRoute("/home");
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    // A map is spatial (north up, east right): never mirrored, even in Arabic.
    expect(
      screen.getByRole("region", { name: i18n.t("home.mapLabel") }),
    ).toHaveAttribute("dir", "ltr");
    await user.click(
      screen.getByRole("button", { name: i18n.t("home.pickCenter") }),
    );
    expect(
      screen.getByRole("heading", { level: 2, name: i18n.t("home.selected") }),
    ).toBeInTheDocument();
    const text = container.textContent ?? "";
    expect(text).toContain("32.400");
    expect(text).toContain(i18n.t("parcel.lat"));
    expect(text).not.toMatch(/[٠-٩۰-۹]/); // Western digits only (§9a)
    expect(text).not.toMatch(/\b(home|parcel|data|units|dataCard)\.|\{\{/);
  });
});
