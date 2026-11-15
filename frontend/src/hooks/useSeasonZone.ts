import { useEffect } from "react";

import type { Remote } from "../state/session";
import { useSession } from "../state/session";
import type { ZoneResponse } from "../types/seasons";

export interface SeasonZone {
  /** Null before any parcel is picked; otherwise the request's state for the current inputs. */
  result: Remote<ZoneResponse> | null;
  /** Re-ask our backend (the error state's "Réessayer"). */
  retry: () => void;
}

/**
 * Season types for the picked parcel's centroid and the farmer's water regime
 * (`GET /api/seasons/zone`). The answer lives in the session (SessionProvider), so every page
 * reading it — Farm, Insights, Recommendations, Crop detail — shares ONE request per
 * (centroid, water). When either changes, the request for the old inputs is aborted and its
 * late answer can never replace the new one; one unanswered after REQUEST_TIMEOUT_MS is
 * aborted and shown as an error.
 */
export function useSeasonZone(): SeasonZone {
  const { parcel, water, seasonZone, loadSeasonZone } = useSession();
  useEffect(() => {
    if (parcel) loadSeasonZone();
  }, [parcel, water, loadSeasonZone]);

  return {
    result: parcel ? (seasonZone ?? { state: "loading" }) : null,
    retry: () => loadSeasonZone({ retry: true }),
  };
}
