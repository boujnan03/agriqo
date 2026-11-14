import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { routes } from "../src/router/routes";

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
