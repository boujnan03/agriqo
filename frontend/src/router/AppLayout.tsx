import { Outlet } from "react-router";

import type { SessionState } from "../state/session";
import { SessionProvider } from "../state/SessionProvider";

export interface AppLayoutProps {
  /** Starting session state; tests use it to open a screen in a given situation. */
  initialState?: Partial<SessionState>;
}

/** Root layout route: one app session shared by every screen, kept while navigating. */
export function AppLayout({ initialState }: AppLayoutProps) {
  return (
    <SessionProvider initialState={initialState}>
      <Outlet />
    </SessionProvider>
  );
}
