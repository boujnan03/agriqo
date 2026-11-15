import type { DiagnosticResponse } from "../src/types/diagnostic";
import type { ForecastResponse } from "../src/types/weather";
import diagnosticOcean from "./fixtures/diagnostic_ocean.json";
import diagnosticTadla from "./fixtures/diagnostic_tadla.json";
import forecastTadla from "./fixtures/forecast_tadla.json";

/**
 * Stand-in for our FastAPI backend in every test (installed by tests/setup.ts as `fetch`).
 *
 * Default answers are REAL responses captured from the backend on 2026-11-15 (no
 * OPENTOPO_API_KEY set, so terrain is `indisponible` / `missing_api_key`), never invented ones.
 * Any request that isn't one of the two API routes is recorded and fails the test: the
 * frontend suite never touches the network.
 */

/** Real backend answers (JSON fixtures typed as the API types they were captured from). */
export const fixtures = {
  diagnosticTadla: diagnosticTadla as unknown as DiagnosticResponse,
  diagnosticOcean: diagnosticOcean as unknown as DiagnosticResponse,
  forecastTadla: forecastTadla as unknown as ForecastResponse,
};

export interface FakeRequest {
  route: "diagnostic" | "forecast";
  lat: number;
  lon: number;
  /** Diagnostic only: the GeoJSON polygon sent (the drawn parcel). */
  polygon?: unknown;
}

/** How the fake backend answers one request. */
export type Responder = (request: FakeRequest) => Promise<Response>;

export const json =
  (body: unknown, status = 200): Responder =>
  () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );

/** The backend is down / unreachable: fetch itself rejects, like a browser would. */
export const unreachable: Responder = () =>
  Promise.reject(new TypeError("Failed to fetch"));

/**
 * A request the test answers by hand (a simulated delay): `responder` waits until
 * `answer(body)` is called, so a test can check the in-flight state first.
 */
export function deferred(): {
  responder: Responder;
  answer: (body: unknown, status?: number) => void;
} {
  let release: ((r: Response) => void) | null = null;
  const waiting = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return {
    responder: () => waiting,
    answer: (body, status = 200) =>
      release?.(
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
      ),
  };
}

/** A request that never answers: the page stays in its loading state. */
export const pending: Responder = () => new Promise<Response>(() => {});

const state = {
  diagnostic: json(fixtures.diagnosticTadla) as Responder,
  forecast: json(fixtures.forecastTadla) as Responder,
  calls: [] as FakeRequest[],
  unexpected: [] as string[],
};

export const fakeBackend = {
  /** Change how one route answers, for the current test. */
  respond(route: FakeRequest["route"], responder: Responder) {
    state[route] = responder;
  },
  /** Every API request the app made in this test, in order. */
  get calls(): readonly FakeRequest[] {
    return state.calls;
  },
  /** Requests to anything else (would have hit the network). Must stay empty. */
  get unexpected(): readonly string[] {
    return state.unexpected;
  },
  reset() {
    state.diagnostic = json(fixtures.diagnosticTadla);
    state.forecast = json(fixtures.forecastTadla);
    state.calls = [];
    state.unexpected = [];
  },
};

/** The `fetch` the app sees in tests. */
export async function fakeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  if (url.pathname === "/api/parcel/diagnostic" && init?.method === "POST") {
    const body = JSON.parse(String(init.body)) as {
      lat: number;
      lon: number;
      polygon: unknown;
    };
    const request: FakeRequest = { route: "diagnostic", ...body };
    state.calls.push(request);
    return state.diagnostic(request);
  }
  if (url.pathname === "/api/weather/forecast") {
    const request: FakeRequest = {
      route: "forecast",
      lat: Number(url.searchParams.get("lat")),
      lon: Number(url.searchParams.get("lon")),
    };
    state.calls.push(request);
    return state.forecast(request);
  }
  state.unexpected.push(`${init?.method ?? "GET"} ${url.href}`);
  throw new TypeError(`unexpected request in tests: ${url.href}`);
}
