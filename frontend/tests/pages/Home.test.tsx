import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import i18n, { LANGUAGES } from "../../src/i18n";
import { fakeBackend, unreachable } from "../fakeBackend";
import {
  drawParcel,
  inLanguage,
  leafletMap,
  picked,
  renderRoute,
  tabBarLabel,
} from "../utils";

const button = (name: string) => screen.getByRole("button", { name });
const summary = async () =>
  (
    await screen.findByRole("heading", {
      level: 2,
      name: "Parcelle sélectionnée",
    })
  ).closest("section") as HTMLElement;
/** The centroid shown in the summary, as numbers [lat, lon]. */
const shownCentre = (section: HTMLElement) =>
  [...section.querySelectorAll("bdi")].map((b) => Number(b.textContent));

describe("Home page (design.md §7.2): drawing the parcel", () => {
  // French copy asserted below: render in French (the app default is Arabic).
  inLanguage("fr");

  it("before drawing: a real Leaflet map, the first instruction, nothing to close or clear", () => {
    renderRoute("/home");
    expect(
      screen.getByRole("heading", { level: 1, name: "Accueil" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Touchez la carte pour placer le premier coin de votre parcelle.",
    );
    expect(leafletMap()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "OpenStreetMap" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    expect(button("Ajouter un coin au centre de la carte")).toBeEnabled();
    expect(button("Fermer le contour")).toBeDisabled();
    expect(button("Annuler le dernier coin")).toBeDisabled();
    expect(button("Effacer")).toBeDisabled();
    expect(
      screen.queryByRole("heading", { name: "Parcelle sélectionnée" }),
    ).toBeNull();
  });

  it("each tap adds a corner where it lands; 3 corners → the outline can be closed", () => {
    renderRoute("/home");
    fireEvent.click(leafletMap(), { clientX: 0, clientY: 0 });
    fireEvent.click(leafletMap(), { clientX: 120, clientY: 0 });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Coins placés : 2. Il en faut au moins 3.",
    );
    expect(button("Fermer le contour")).toBeDisabled();
    fireEvent.click(leafletMap(), { clientX: 0, clientY: 90 });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Coins placés : 3. Fermez le contour quand la parcelle est complète.",
    );
    expect(button("Fermer le contour")).toBeEnabled();
    // 3 corner markers + the dashed line joining them.
    expect(
      leafletMap().querySelectorAll("path.leaflet-interactive"),
    ).toHaveLength(4);
  });

  it("closing makes it the parcel: its centroid lies inside the drawn triangle", async () => {
    renderRoute("/home");
    drawParcel();
    const section = await summary();
    const [lat, lon] = shownCentre(section);
    // Taps at (0,0), (120,0), (0,90) px from the centre at zoom 10: a triangle east and south
    // of 32.4 / -6.45, whose centroid is one third of the way along each leg.
    expect(lon).toBeGreaterThan(-6.45);
    expect(lat).toBeLessThan(32.4);
    expect(lat).toBeGreaterThan(32.2);
    expect(section).toHaveTextContent("3 coins");
    // French groups thousands with a narrow no-break space (this test triangle spans km).
    expect(section).toHaveTextContent(/Surface ≈ [\d\s,]+ ha/);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Contour fermé (3 coins). Effacez-le pour redessiner.",
    );
  });

  it("the diagnostic request carries the centroid AND the drawn polygon (GeoJSON, closed ring)", async () => {
    renderRoute("/home");
    drawParcel();
    await within(await summary()).findByText("Franco-argileuse");
    expect(fakeBackend.calls).toHaveLength(1);
    const [call] = fakeBackend.calls;
    const polygon = call.polygon as {
      type: string;
      coordinates: [number, number][][];
    };
    expect(polygon.type).toBe("Polygon");
    const ring = polygon.coordinates[0];
    expect(ring).toHaveLength(4); // 3 corners + the first repeated
    expect(ring[3]).toEqual(ring[0]);
    // [lon, lat] order; a triangle's centroid is the mean of its corners.
    const mean = (i: 0 | 1) => (ring[0][i] + ring[1][i] + ring[2][i]) / 3;
    expect(call.lon).toBeCloseTo(mean(0), 6);
    expect(call.lat).toBeCloseTo(mean(1), 6);
  });

  it("undo removes the last corner; clear removes the closed parcel (and its summary)", async () => {
    const user = userEvent.setup();
    renderRoute("/home");
    fireEvent.click(leafletMap(), { clientX: 0, clientY: 0 });
    fireEvent.click(leafletMap(), { clientX: 50, clientY: 0 });
    await user.click(button("Annuler le dernier coin"));
    expect(screen.getByRole("status")).toHaveTextContent("Coins placés : 1.");

    drawParcel(); // adds 3 more corners to the 1 left, then closes: a 4-corner parcel
    expect(await summary()).toHaveTextContent("4 coins");
    // Closed: further taps don't move it.
    fireEvent.click(leafletMap(), { clientX: 300, clientY: 300 });
    expect(await summary()).toHaveTextContent("4 coins");

    await user.click(button("Effacer"));
    expect(
      screen.queryByRole("heading", { name: "Parcelle sélectionnée" }),
    ).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Touchez la carte pour placer le premier coin",
    );
  });

  it("corners that enclose no area (all on one point) can't be closed", async () => {
    const user = userEvent.setup();
    renderRoute("/home");
    for (let i = 0; i < 3; i++) {
      await user.click(button("Ajouter un coin au centre de la carte"));
    }
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ces coins n'entourent aucune surface",
    );
    expect(button("Fermer le contour")).toBeDisabled();
  });

  it("keyboard only (§9): pan with the arrow keys, add corners at the centre, close", async () => {
    const user = userEvent.setup();
    renderRoute("/home");
    const map = leafletMap();
    const addAtCentre = () =>
      user.click(button("Ajouter un coin au centre de la carte"));

    // Leaflet's keyboard panning reads `keyCode`, which real browsers set but user-event's
    // simulated keys leave at 0: send the real key codes (39 = →, 40 = ↓) to the focused map.
    const press = (key: string, keyCode: number) => {
      map.focus();
      fireEvent.keyDown(map, { key, code: key, keyCode, which: keyCode });
    };
    await addAtCentre();
    press("ArrowRight", 39);
    await addAtCentre();
    press("ArrowDown", 40);
    await addAtCentre();
    expect(button("Fermer le contour")).toBeEnabled();
    await user.click(button("Fermer le contour"));

    const [lat, lon] = shownCentre(await summary());
    // Panned east then south of the start (32.4, -6.45): the centroid moved that way.
    expect(lon).toBeGreaterThan(-6.45);
    expect(lat).toBeLessThan(32.4);
  });

  it("backend unreachable after drawing: the request error state, the parcel still shown", async () => {
    fakeBackend.respond("diagnostic", unreachable);
    renderRoute("/home", picked);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Serveur injoignable",
    );
    expect(screen.getByText("32.400")).toBeInTheDocument();
  });

  it("'Voir le diagnostic complet' opens Farm for the same parcel, with ONE shared request", async () => {
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
    const { container } = renderRoute("/home");
    expect(document.documentElement).toHaveAttribute(
      "dir",
      lng === "ar" ? "rtl" : "ltr",
    );
    // A map is spatial (north up, east right): never mirrored, even in Arabic.
    expect(
      screen.getByRole("region", { name: i18n.t("home.mapLabel") }),
    ).toHaveAttribute("dir", "ltr");
    drawParcel();
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: i18n.t("home.selected"),
      }),
    ).toBeInTheDocument();
    const text = container.textContent ?? "";
    expect(text).toContain(i18n.t("parcel.centre"));
    expect(text).toContain(i18n.t("home.draw.clear"));
    expect(text).not.toMatch(/[٠-٩۰-۹]/); // Western digits only (§9a)
    expect(text).not.toMatch(/\b(home|parcel|data|units|dataCard)\.|\{\{/);
  });
});
