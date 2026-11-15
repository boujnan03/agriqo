import { createContext, useContext } from "react";

/** A real point picked on Home's map (WGS 84 degrees). */
export interface ParcelLocation {
  lat: number;
  lon: number;
}

/**
 * In-memory app session: plain React state, never persisted (a page reload starts over) and
 * never sent anywhere except to our own backend. Provided once for the whole route tree by
 * SessionProvider.
 */
export interface SessionState {
  /**
   * The parcel picked on Home's map (design.md §7.2), or null before any pick. Farm, Insights
   * and Weather show data for it, or an empty state pointing back to Home while it is null.
   */
  parcel: ParcelLocation | null;
}

export interface Session extends SessionState {
  pickParcel: (location: ParcelLocation) => void;
}

export const SessionContext = createContext<Session | null>(null);

/** The app session. Must be rendered under SessionProvider (the root layout route does that). */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession() needs a <SessionProvider>");
  return session;
}
