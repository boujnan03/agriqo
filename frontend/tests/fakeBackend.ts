import type { DiagnosticResponse } from "../src/types/diagnostic";
import type { WaterRegime, ZoneResponse } from "../src/types/seasons";
import type { ForecastResponse } from "../src/types/weather";
import diagnosticOcean from "./fixtures/diagnostic_ocean.json";
import diagnosticTadla from "./fixtures/diagnostic_tadla.json";
import forecastTadla from "./fixtures/forecast_tadla.json";
import zoneC046 from "./fixtures/seasons/zone-c046-no-heat.json";
import zoneC057 from "./fixtures/seasons/zone-c057.json";
import zoneC057Irrigue from "./fixtures/seasons/zone-c057-irrigue.json";
import zoneC113 from "./fixtures/seasons/zone-c113-proche.json";
import zoneOcean from "./fixtures/seasons/zone-ocean-hors-zone.json";

/**
 * Stand-in for our FastAPI backend in every test (installed by tests/setup.ts as `fetch`).
 *
 * Default answers are REAL responses captured from the backend on 2026-11-15 (no
 * OPENTOPO_API_KEY set, so terrain is `indisponible` / `missing_api_key`), never invented ones.
 * The season-zone fixtures (tests/fixtures/seasons/) were captured from the real
 * `GET /api/seasons/zone` (AGRIQO v5 model): C057 for the Tadla test parcel (32.4, -6.45), C113
 * "proche" (Tanger, 35.77, -5.8), the ocean "hors_zone" (33.0, -9.5) and C046 (32.0, -5.625,
 * heatRelevant false). Any request that isn't an API route is recorded and fails the test: the
 * frontend suite never touches the network.
 */

/** Real backend answers (JSON fixtures typed as the API types they were captured from). */
export const fixtures = {
  diagnosticTadla: diagnosticTadla as unknown as DiagnosticResponse,
  diagnosticOcean: diagnosticOcean as unknown as DiagnosticResponse,
  forecastTadla: forecastTadla as unknown as ForecastResponse,
  zoneC057: zoneC057 as unknown as ZoneResponse,
  /** The same point asked with water=irrigue (real answer: 4 rules switch variant). */
  zoneC057Irrigue: zoneC057Irrigue as unknown as ZoneResponse,
  zoneC113Proche: zoneC113 as unknown as ZoneResponse,
  zoneOcean: zoneOcean as unknown as ZoneResponse,
  zoneC046NoHeat: zoneC046 as unknown as ZoneResponse,
};

export interface FakeRequest {
  route: "diagnostic" | "forecast" | "seasons";
  lat: number;
  lon: number;
  /** Diagnostic only: the GeoJSON polygon sent (the drawn parcel). */
  polygon?: unknown;
  /** Seasons only: the water regime asked for. */
  water?: WaterRegime | string | null;
  /** Seasons only: the AbortSignal the app passed (to check a superseded request is aborted). */
  signal?: AbortSignal | null;
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

/**
 * The season endpoint as the real backend behaves for the Tadla parcel: the answer for the
 * water regime asked (both captured from the backend), so switching Farm to "Irriguée" really
 * changes the advice variants.
 */
export const seasonsByWater: Responder = (request) =>
  json(
    request.water === "irrigue" ? fixtures.zoneC057Irrigue : fixtures.zoneC057,
  )(request);

/** A request that never answers: the page stays in its loading state. */
export const pending: Responder = () => new Promise<Response>(() => {});

const state = {
  diagnostic: json(fixtures.diagnosticTadla) as Responder,
  forecast: json(fixtures.forecastTadla) as Responder,
  seasons: json(fixtures.zoneC057) as Responder,
  calls: [] as FakeRequest[],
  seasonCalls: [] as FakeRequest[],
  unexpected: [] as string[],
};

export const fakeBackend = {
  /** Change how one route answers, for the current test. */
  respond(route: FakeRequest["route"], responder: Responder) {
    state[route] = responder;
  },
  /** Every diagnostic / forecast request the app made in this test, in order. */
  get calls(): readonly FakeRequest[] {
    return state.calls;
  },
  /**
   * Every season-zone request, in order. Kept apart from `calls` so the diagnostic/forecast
   * assertions stay about those two routes only (Farm and Insights also ask for seasons).
   */
  get seasonCalls(): readonly FakeRequest[] {
    return state.seasonCalls;
  },
  /** Requests to anything else (would have hit the network). Must stay empty. */
  get unexpected(): readonly string[] {
    return state.unexpected;
  },
  reset() {
    state.diagnostic = json(fixtures.diagnosticTadla);
    state.forecast = json(fixtures.forecastTadla);
    state.seasons = json(fixtures.zoneC057);
    state.calls = [];
    state.seasonCalls = [];
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
  if (url.pathname === "/api/seasons/zone") {
    const request: FakeRequest = {
      route: "seasons",
      lat: Number(url.searchParams.get("lat")),
      lon: Number(url.searchParams.get("lon")),
      water: url.searchParams.get("water"),
      signal: init?.signal ?? null,
    };
    state.seasonCalls.push(request);
    return state.seasons(request);
  }
  state.unexpected.push(`${init?.method ?? "GET"} ${url.href}`);
  throw new TypeError(`unexpected request in tests: ${url.href}`);
}
