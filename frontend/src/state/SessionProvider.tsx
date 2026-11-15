import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";

import { fetchDiagnostic, fetchForecast } from "../services/api";
import type {
  DiagnosticBlockKey,
  DiagnosticResponse,
} from "../types/diagnostic";
import {
  type BlockRetryState,
  type Parcel,
  type Remote,
  type RemoteData,
  type RemoteKind,
  type Session,
  SessionContext,
  type SessionState,
} from "./session";

const INITIAL: SessionState = { parcel: null };

const FETCHERS: {
  [K in RemoteKind]: (parcel: Parcel) => Promise<RemoteData[K]>;
} = {
  // The diagnostic gets the drawn polygon too (terrain uses its extent)…
  diagnostic: (parcel) => fetchDiagnostic(parcel),
  // …the forecast is point-based: the centroid only.
  forecast: (parcel) => fetchForecast({ lat: parcel.lat, lon: parcel.lon }),
};

/**
 * One answer per drawn parcel: its corners at ~1 m (the centroid follows from them). Two
 * parcels with the same centroid but different shapes don't share terrain data.
 */
const keyOf = (p: Parcel) =>
  p.polygon.map((c) => `${c.lat.toFixed(5)},${c.lon.toFixed(5)}`).join(";");

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

  // Block retries, tagged with the parcel they were for (a new parcel hides old ones).
  const [blockRetry, setBlockRetry] = useState<{
    key: string;
    blocks: Partial<Record<DiagnosticBlockKey, BlockRetryState>>;
  }>({ key: "", blocks: {} });

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

  const retryDiagnosticBlock = useCallback<Session["retryDiagnosticBlock"]>(
    (block) => {
      const parcel = state.parcel;
      if (!parcel) return;
      const key = keyOf(parcel);
      const current = cacheRef.current.diagnostic;
      if (current?.key !== key || current.result.state !== "success") return;
      const mark = (value: BlockRetryState | undefined) =>
        setBlockRetry((r) => ({
          key,
          blocks: { ...(r.key === key ? r.blocks : {}), [block]: value },
        }));
      mark("retrying");
      fetchDiagnostic(parcel).then(
        (fresh) => {
          const latest = cacheRef.current.diagnostic;
          // Another parcel was picked meanwhile, or the answer is gone: drop this one.
          if (latest?.key !== key || latest.result.state !== "success") return;
          commit("diagnostic", {
            key,
            result: {
              state: "success",
              data: {
                ...(latest.result.data as DiagnosticResponse),
                [block]: fresh[block],
              },
            },
          });
          mark(undefined);
        },
        () => mark("failed"),
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
      retryDiagnosticBlock,
      blockRetry: blockRetry.key === key ? blockRetry.blocks : {},
    };
  }, [state, cache, load, retryDiagnosticBlock, blockRetry]);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
