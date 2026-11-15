import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach } from "vitest";

import i18n, { type Language } from "../src/i18n";
import { AppLayout } from "../src/router/AppLayout";
import { pageRoutes } from "../src/router/routes";
import { TAB_BAR_LABEL_KEY } from "../src/router/tabs";
import type { SessionState } from "../src/state/session";
import { SessionProvider } from "../src/state/SessionProvider";

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
