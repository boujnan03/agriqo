import { createContext, useContext } from "react";

import type { DiagnosticResponse } from "../types/diagnostic";
import type { ForecastResponse } from "../types/weather";
import type { LatLon, Parcel } from "./parcelGeometry";

/** A real point (WGS 84 degrees): a parcel's centroid, a map position. */
export type ParcelLocation = LatLon;
export type { Parcel };

/**
 * In-memory app session: plain React state, never persisted (a page reload starts over) and
 * never sent anywhere except to our own backend. Provided once for the whole route tree by
 * SessionProvider.
 */
export interface SessionState {
  /**
   * The parcel drawn on Home's map (design.md §7.2): its corners + centroid, or null before
   * one is drawn. Farm, Insights and Weather show data for it, or an empty state pointing
   * back to Home while it is null.
   */
  parcel: Parcel | null;
}

/** What each backend request returns. */
export interface RemoteData {
  diagnostic: DiagnosticResponse;
  forecast: ForecastResponse;
}
export type RemoteKind = keyof RemoteData;

/**
 * One request to OUR backend (design.md §6 Request states): in flight, answered, or failed
 * outright. A successful answer can still contain `indisponible` blocks: that is data, shown
 * by the Data cards, not a request error.
 */
export type Remote<T> =
  { state: "loading" } | { state: "success"; data: T } | { state: "error" };

export interface Session extends SessionState {
  /** Set (or, with null, clear) the drawn parcel. */
  pickParcel: (parcel: Parcel | null) => void;
  /** Latest result per request kind, for the current parcel only (undefined: not asked yet). */
  remote: { [K in RemoteKind]?: Remote<RemoteData[K]> };
  /**
   * Ask the backend for `kind` about the current parcel. No-op if that answer is already
   * loading or loaded for this parcel, so pages sharing one response (Home, Farm, Insights all
   * read the diagnostic) never fetch it twice. `retry` re-asks after an error.
   */
  load: (kind: RemoteKind, options?: { retry?: boolean }) => void;
}

export const SessionContext = createContext<Session | null>(null);

/** The app session. Must be rendered under SessionProvider (the root layout route does that). */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession() needs a <SessionProvider>");
  return session;
}
