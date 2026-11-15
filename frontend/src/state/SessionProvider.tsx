import { type ReactNode, useMemo, useState } from "react";

import { type Session, SessionContext, type SessionState } from "./session";

const INITIAL: SessionState = { signedIn: false, parcelPicked: false };

export interface SessionProviderProps {
  /** Starting state; tests use it to open a screen in a given situation. */
  initialState?: Partial<SessionState>;
  children: ReactNode;
}

export function SessionProvider({
  initialState,
  children,
}: SessionProviderProps) {
  const [state, setState] = useState<SessionState>({
    ...INITIAL,
    ...initialState,
  });
  const session = useMemo<Session>(
    () => ({
      ...state,
      signIn: () => setState((s) => ({ ...s, signedIn: true })),
      signOut: () => setState(INITIAL),
      pickParcel: () => setState((s) => ({ ...s, parcelPicked: true })),
    }),
    [state],
  );
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
