import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach } from "vitest";

import i18n, { type Language } from "../src/i18n";
import { routes } from "../src/router/routes";
import { TAB_BAR_LABEL_KEY } from "../src/router/tabs";

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

/** Renders a component inside a router (needed by Link/NavLink), at the given URL. */
export function renderWithRouter(ui: ReactElement, path = "/") {
  const router = createMemoryRouter([{ path: "*", element: ui }], {
    initialEntries: [path],
  });
  return render(<RouterProvider router={router} />);
}

/** Renders the real app route table at the given URL. */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}
