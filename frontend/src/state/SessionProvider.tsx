import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { fetchDiagnostic, fetchForecast } from "../services/api";
import {
  type ParcelLocation,
  type Remote,
  type RemoteData,
  type RemoteKind,
  type Session,
  SessionContext,
  type SessionState,
} from "./session";

const INITIAL: SessionState = { parcel: null };

const FETCHERS: {
  [K in RemoteKind]: (location: ParcelLocation) => Promise<RemoteData[K]>;
} = {
  diagnostic: (location) => fetchDiagnostic(location),
  forecast: (location) => fetchForecast(location),
};

/** Same rounding as the backend cache (3 decimals ≈ 110 m): one answer per point. */
const keyOf = (p: ParcelLocation) => `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;

type Entry = { key: string; result: Remote<unknown> };
type Cache = Partial<Record<RemoteKind, Entry>>;

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
  // The cache is read synchronously by `load` (a ref), and mirrored into state to re-render.
  // Without the ref, StrictMode's double effects would start the same request twice.
  const cacheRef = useRef<Cache>({});
  const [cache, setCache] = useState<Cache>({});

  const commit = useCallback((kind: RemoteKind, entry: Entry) => {
    cacheRef.current = { ...cacheRef.current, [kind]: entry };
    setCache(cacheRef.current);
  }, []);

  const load = useCallback<Session["load"]>(
    (kind, options) => {
      const parcel = state.parcel;
      if (!parcel) return;
      const key = keyOf(parcel);
      const current = cacheRef.current[kind];
      if (current?.key === key) {
        const retrying = options?.retry && current.result.state === "error";
        if (!retrying) return;
      }
      commit(kind, { key, result: { state: "loading" } });
      FETCHERS[kind](parcel).then(
        (data) => {
          // Drop the answer if the farmer picked another point meanwhile.
          if (cacheRef.current[kind]?.key === key) {
            commit(kind, { key, result: { state: "success", data } });
          }
        },
        () => {
          if (cacheRef.current[kind]?.key === key) {
            commit(kind, { key, result: { state: "error" } });
          }
        },
      );
    },
    [commit, state.parcel],
  );

  const session = useMemo<Session>(() => {
    const key = state.parcel ? keyOf(state.parcel) : null;
    // Only answers about the current parcel are visible; older ones are as good as absent.
    const remote: Session["remote"] = {};
    for (const kind of Object.keys(cache) as RemoteKind[]) {
      const entry = cache[kind];
      if (entry && entry.key === key) {
        (remote as Record<RemoteKind, Remote<unknown>>)[kind] = entry.result;
      }
    }
    return {
      ...state,
      pickParcel: (parcel) => setState((s) => ({ ...s, parcel })),
      remote,
      load,
    };
  }, [state, cache, load]);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
