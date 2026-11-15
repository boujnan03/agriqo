import { createContext, useContext } from "react";

/**
 * In-memory app session: plain React state, never persisted (a page reload starts over) and
 * never sent anywhere. Provided once for the whole route tree by SessionProvider.
 */
export interface SessionState {
  /** Set by the Cover login gate (design.md §7.1); a UX moment, not real auth. */
  signedIn: boolean;
  /**
   * A parcel has been picked on Home's map (design.md §7.2). Farm and Weather show data for
   * it, or an empty state pointing back to Home while this is false (§7.3, §7.8).
   */
  parcelPicked: boolean;
}

export interface Session extends SessionState {
  signIn: () => void;
  signOut: () => void;
  pickParcel: () => void;
}

export const SessionContext = createContext<Session | null>(null);

/** The app session. Must be rendered under SessionProvider (the root layout route does that). */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession() needs a <SessionProvider>");
  return session;
}
