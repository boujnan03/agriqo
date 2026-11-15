import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach } from "vitest";

import i18n, { type Language } from "../src/i18n";
import { AppLayout } from "../src/router/AppLayout";
import { pageRoutes } from "../src/router/routes";
import { TAB_BAR_LABEL_KEY } from "../src/router/tabs";
import {
  type LatLon,
  type Parcel,
  parcelFromCorners,
  toGeoJson,
} from "../src/state/parcelGeometry";
import type { SessionState } from "../src/state/session";
import { SessionProvider } from "../src/state/SessionProvider";

/** Corners of the test parcel: a ~110 m square on the Tadla plain, ~10 km NW of Béni Mellal. */
export const TADLA_CORNERS: LatLon[] = [
  { lat: 32.3995, lon: -6.4505 },
  { lat: 32.3995, lon: -6.4495 },
  { lat: 32.4005, lon: -6.4495 },
  { lat: 32.4005, lon: -6.4505 },
];

/** The test parcel, built exactly as Home builds one (centroid ≈ 32.400, -6.450). */
export const TADLA: Parcel = parcelFromCorners(TADLA_CORNERS);

/** The diagnostic request body the app must send for TADLA. */
export const TADLA_REQUEST = {
  route: "diagnostic" as const,
  lat: TADLA.lat,
  lon: TADLA.lon,
  polygon: toGeoJson(TADLA_CORNERS),
};

/** A session where that parcel has been drawn on Home. */
export const picked: Partial<SessionState> = { parcel: TADLA };

/** The Leaflet map element inside Home's map region. */
export const leafletMap = (): HTMLElement =>
  screen
    .getByRole("region", { name: i18n.t("home.mapLabel") })
    .querySelector(".leaflet-container") as HTMLElement;

/**
 * Draws a triangle on Home's map by tapping three points, then closes the outline. jsdom has
 * no layout (a 0×0 map), so a tap's offset from the origin is its offset from the map centre.
 */
export function drawParcel(): void {
  for (const [x, y] of [
    [0, 0],
    [120, 0],
    [0, 90],
  ]) {
    fireEvent.click(leafletMap(), { clientX: x, clientY: y });
  }
  fireEvent.click(
    screen.getByRole("button", { name: i18n.t("home.draw.close") }),
  );
}

/**
 * Runs every test of the enclosing describe/file in `language` instead of the Arabic default
 * (tests/setup.ts resets to Arabic after each test).
 */
export function inLanguage(language: Language) {
  beforeEach(async () => {
    await i18n.changeLanguage(language);
  });
}

/** Accessible name of the tab bar <nav>, in the active language. */
export const tabBarLabel = (): string => i18n.t(TAB_BAR_LABEL_KEY);

/**
 * Renders a component inside a router (needed by Link/NavLink) and an app session, at the
 * given URL.
 */
export function renderWithRouter(
  ui: ReactElement,
  path = "/",
  session?: Partial<SessionState>,
) {
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: <SessionProvider initialState={session}>{ui}</SessionProvider>,
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

/**
 * Renders the real app route table at the given URL, starting from the given session state
 * (default: a fresh session, exactly as on first load).
 */
export function renderRoute(path: string, session?: Partial<SessionState>) {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout initialState={session} />,
        children: pageRoutes,
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}
