/**
 * Backend API client: PLACEHOLDER. NOT WIRED TO ANYTHING YET.
 *
 * Real calls to backend/ (FastAPI) will live in this folder, one function per endpoint, so
 * pages never call fetch() directly. Nothing imports this file today: pages use mock data
 * from src/mocks/ until the backend exposes real endpoints.
 *
 * Known gap before this can be used from the browser: the backend has no CORS
 * configuration, so a call from the frontend origin (localhost:8080) to localhost:8000
 * will be blocked. See ARCHITECTURE.md.
 */

/** Set at build time (docker-compose build arg / .env). Browser-side URL, not the Docker one. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** Shape of the backend's only route today (backend/app/main.py). */
export interface HealthResponse {
  status: "ok";
}

/** Example of the intended shape: typed result, AbortSignal support, HTTP errors thrown. */
export async function fetchHealth(
  signal?: AbortSignal,
): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, { signal });
  if (!response.ok) {
    throw new Error(`GET /health failed with HTTP ${response.status}`);
  }
  return (await response.json()) as HealthResponse;
}
