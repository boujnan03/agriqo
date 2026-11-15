import { useEffect, useState } from "react";

import { fetchSeasonZone, REQUEST_TIMEOUT_MS } from "../services/api";
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
 * (`GET /api/seasons/zone`). Refetches when the centroid or the water regime changes, aborting
 * the request still in flight, so a slow old answer can never overwrite a newer one: an answer
 * is only shown if it was asked for the current inputs (its key). A request still unanswered
 * after REQUEST_TIMEOUT_MS is aborted and shown as an error.
 */
export function useSeasonZone(): SeasonZone {
  const { parcel, water } = useSession();
  const lat = parcel?.lat;
  const lon = parcel?.lon;
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{
    key: string;
    result: Remote<ZoneResponse>;
  } | null>(null);

  const key =
    lat === undefined || lon === undefined
      ? null
      : `${lat},${lon},${water},${attempt}`;

  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    const asked = `${lat},${lon},${water},${attempt}`;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    fetchSeasonZone({ lat, lon, water }, controller.signal)
      .then(
        (data) => {
          // A late answer to an abandoned request must not replace the current one.
          if (controller.signal.aborted) return;
          setAnswer({ key: asked, result: { state: "success", data } });
        },
        () => {
          // Aborted because the inputs changed (or the page closed): nobody wants this one.
          if (controller.signal.aborted && !timedOut) return;
          setAnswer({ key: asked, result: { state: "error" } });
        },
      )
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [lat, lon, water, attempt]);

  return {
    result:
      key === null
        ? null
        : answer?.key === key
          ? answer.result
          : { state: "loading" },
    retry: () => setAttempt((n) => n + 1),
  };
}
