import { useEffect } from "react";

import {
  type Remote,
  type RemoteData,
  type RemoteKind,
  useSession,
} from "./session";

export interface ParcelData<T> {
  /** Null before any parcel is picked; otherwise the request's state for that parcel. */
  result: Remote<T> | null;
  /** Re-ask our backend after a failed request (the error state's button). */
  retry: () => void;
}

/**
 * The backend's answer about the picked parcel, fetched on first use and shared by every page
 * that asks for the same kind (one diagnostic request serves Home, Farm and Insights).
 */
export function useParcelData<K extends RemoteKind>(
  kind: K,
): ParcelData<RemoteData[K]> {
  const { parcel, remote, load } = useSession();
  useEffect(() => {
    if (parcel) load(kind);
  }, [parcel, kind, load]);

  const result = parcel
    ? ((remote[kind] as Remote<RemoteData[K]> | undefined) ?? {
        state: "loading",
      })
    : null;
  return { result, retry: () => load(kind, { retry: true }) };
}
