/**
 * Backend API client: one function per endpoint, so pages never call fetch() directly.
 *
 * Two kinds of "missing data" must never be confused (design.md §6 Request states):
 * - the request to OUR backend fails (network down, backend not running, HTTP 5xx, timeout):
 *   these functions THROW, and the page shows its error state with a retry button;
 * - the backend answers, but one of ITS sources failed: that is a normal response whose block
 *   says `status: "indisponible"`, shown by that block's Data card. Nothing is thrown.
 *
 * CORS: the backend allows http://localhost:8080 (nginx / dev container) and :5173 (Vite).
 */
import { type Parcel, toGeoJson } from "../state/parcelGeometry";
import type { DiagnosticResponse } from "../types/diagnostic";
import type { WaterRegime, ZoneResponse } from "../types/seasons";
import type { ForecastResponse } from "../types/weather";

/** Set at build time (docker-compose build arg / .env). Browser-side URL, not the Docker one. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/**
 * Upper bound for one request to our backend. The diagnostic waits for up to four upstream
 * APIs in parallel, each capped at 15 s by the backend, so 30 s leaves room without hanging.
 */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Our own backend could not be reached, or answered with an HTTP error. */
export class ApiError extends Error {
  /** HTTP status, or null when no response arrived at all (network, CORS, timeout). */
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    throw new ApiError(`${path}: no response (${String(cause)})`, null);
  }
  if (!response.ok) {
    throw new ApiError(`${path}: HTTP ${response.status}`, response.status);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(`${path}: invalid JSON`, response.status);
  }
}

/** Shape of `GET /health`. */
export interface HealthResponse {
  status: "ok";
}

export function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>("/health", { signal });
}

/**
 * `POST /api/parcel/diagnostic` for a drawn parcel: `lat`/`lon` = its centroid (used by the
 * point-based sources, NASA POWER and SoilGrids), `polygon` = its real shape as GeoJSON (used
 * by OpenTopography: box = the polygon's extent, slope averaged inside it).
 */
export function fetchDiagnostic(
  parcel: Parcel,
  signal?: AbortSignal,
): Promise<DiagnosticResponse> {
  return request<DiagnosticResponse>("/api/parcel/diagnostic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lat: parcel.lat,
      lon: parcel.lon,
      polygon: toGeoJson(parcel.polygon),
    }),
    signal,
  });
}

/** `GET /api/weather/forecast`: today + 7 days for one point. */
export function fetchForecast(
  location: { lat: number; lon: number },
  signal?: AbortSignal,
): Promise<ForecastResponse> {
  const query = new URLSearchParams({
    lat: String(location.lat),
    lon: String(location.lon),
  });
  return request<ForecastResponse>(`/api/weather/forecast?${query}`, {
    signal,
  });
}

/**
 * `GET /api/seasons/zone`: past season types of the NASA POWER cell around a point (the
 * parcel's centroid), plus rule-based advice for the farmer's water regime. A point outside
 * the covered cells is a normal answer (`status: "hors_zone"`, HTTP 200), not an error; a 503
 * (the season model failed to load on the server) throws like any other HTTP error.
 */
export function fetchSeasonZone(
  params: { lat: number; lon: number; water: WaterRegime },
  signal?: AbortSignal,
): Promise<ZoneResponse> {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    water: params.water,
  });
  return request<ZoneResponse>(`/api/seasons/zone?${query}`, { signal });
}
