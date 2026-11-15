import { createContext, useContext } from "react";

import type {
  DiagnosticBlockKey,
  DiagnosticResponse,
} from "../types/diagnostic";
import type { WaterRegime } from "../types/seasons";
import type { ForecastResponse } from "../types/weather";
import type { LatLon, Parcel } from "./parcelGeometry";

/** A real point (WGS 84 degrees): a parcel's centroid, a map position. */
export type ParcelLocation = LatLon;
export type { Parcel };

/**
 * App session: plain React state, never sent anywhere except to our own backend. Provided once
 * for the whole route tree by SessionProvider. The parcel is in memory only (a page reload
 * starts over); the water regime is a farmer preference kept in localStorage.
 */
export interface SessionState {
  /**
   * The parcel drawn on Home's map (design.md §7.2): its corners + centroid, or null before
   * one is drawn. Farm, Insights and Weather show data for it, or an empty state pointing
   * back to Home while it is null.
   */
  parcel: Parcel | null;
  /**
   * Rain-fed or irrigated, chosen by the farmer on Farm (design.md §7.3). Farmer-entered, NOT
   * NASA data: it only selects the advice variant the season endpoint returns. Persisted in
   * localStorage (key `agriqo.farm`), default "pluvial"; works without storage.
   */
  water: WaterRegime;
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

/** A one-block retry (e.g. Soil's "Retry"): in flight, or its request to our backend failed. */
export type BlockRetryState = "retrying" | "failed";

export interface Session extends SessionState {
  /** Set (or, with null, clear) the drawn parcel. */
  pickParcel: (parcel: Parcel | null) => void;
  /** Set the water regime (and remember it on this device). */
  setWater: (water: WaterRegime) => void;
  /** Latest result per request kind, for the current parcel only (undefined: not asked yet). */
  remote: { [K in RemoteKind]?: Remote<RemoteData[K]> };
  /**
   * Ask the backend for `kind` about the current parcel. No-op if that answer is already
   * loading or loaded for this parcel, so pages sharing one response (Home, Farm, Insights all
   * read the diagnostic) never fetch it twice. `retry` re-asks after an error.
   */
  load: (kind: RemoteKind, options?: { retry?: boolean }) => void;
  /**
   * Re-send the SAME diagnostic request (same parcel, same body) and replace only `block` in
   * the shared answer with the new one: the other cards keep exactly what they showed. Used by
   * a Data card's "Retry" when its source was `indisponible` (e.g. SoilGrids timed out while
   * the backend keeps fetching it in the background).
   */
  retryDiagnosticBlock: (block: DiagnosticBlockKey) => void;
  /** State of each block retry, for the current parcel (absent: none running or failed). */
  blockRetry: Partial<Record<DiagnosticBlockKey, BlockRetryState>>;
}

export const SessionContext = createContext<Session | null>(null);

/** The app session. Must be rendered under SessionProvider (the root layout route does that). */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession() needs a <SessionProvider>");
  return session;
}
