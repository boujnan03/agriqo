import type { RouteObject } from "react-router";

import { BuildSmoke } from "../pages/BuildSmoke";
import { Cover } from "../pages/Cover";
import { CropDetail } from "../pages/CropDetail";
import { Farm } from "../pages/Farm";
import { MapPage } from "../pages/Map";
import { NotFound } from "../pages/NotFound";
import { Overview } from "../pages/Overview";
import { Profile } from "../pages/Profile";
import { Recommendations } from "../pages/Recommendations";
import { PATHS } from "./paths";

/** Route table, shared by the browser router (router.ts) and the tests (memory router). */
export const routes: RouteObject[] = [
  { path: PATHS.cover, element: <Cover /> },
  { path: PATHS.farm, element: <Farm /> },
  { path: PATHS.overview, element: <Overview /> },
  { path: PATHS.recommendations, element: <Recommendations /> },
  { path: PATHS.crop, element: <CropDetail /> },
  { path: PATHS.map, element: <MapPage /> },
  { path: PATHS.profile, element: <Profile /> },
  { path: PATHS.smoke, element: <BuildSmoke /> },
  { path: PATHS.notFound, element: <NotFound /> },
];
