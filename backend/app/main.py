"""Field Shift backend (FastAPI).

Endpoints:
- GET  /health                  liveness probe (Docker healthcheck)
- POST /api/parcel/diagnostic   soil + climate + soil moisture + relief for a point
- GET  /api/weather/forecast    today + 7-day forecast for a point

Every data block reports its own `status` and `source`; missing data is never invented.
Recommendations are out of scope here (a teammate's ML model, attached later).
"""
from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import background, config
from app.diagnostic import build_diagnostic
from app.models import DiagnosticRequest, DiagnosticResponse, WeatherResponse
from app.weather import build_forecast

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # One pooled client for every upstream call. Its own timeout is a per-operation
    # backstop; the real 15 s end-to-end limit is enforced per call in run_source.
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(config.EXTERNAL_TIMEOUT_S),
        headers={"User-Agent": config.USER_AGENT},
        follow_redirects=True,
    ) as client:
        app.state.http = client
        yield
        # Stop background re-fetches before their HTTP client closes.
        await background.cancel_all()


app = FastAPI(title="Field Shift backend", version="0.1.0", lifespan=lifespan)

# Browser origins allowed to call the API: the nginx build (:8080) and the Vite dev server
# (:5173) by default; override with a comma-separated CORS_ORIGINS env var.
_origins = os.environ.get("CORS_ORIGINS", "http://localhost:8080,http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

_RANGES = {"lat": (-90, 90), "lon": (-180, 180)}


def _error_message(err: dict) -> str:
    loc = [str(part) for part in err.get("loc", ())]
    # Our own validators' messages are already plain French: drop Pydantic's prefix.
    msg = str(err.get("msg", "")).removeprefix("Value error, ")
    if "polygon" in loc:
        return f"Polygone invalide : {msg}."
    if err.get("type") == "value_error":
        return f"Requête invalide : {msg}."
    field = loc[-1] if loc else "?"
    if field in _RANGES and err.get("type") in {
        "greater_than_equal",
        "less_than_equal",
        "finite_number",
    }:
        lo, hi = _RANGES[field]
        return f"{field} doit être compris entre {lo} et {hi} (reçu : {err.get('input')})."
    if err.get("type") == "missing":
        return f"Paramètre « {field} » manquant."
    return f"Paramètre « {field} » invalide : {err.get('msg')}."


@app.exception_handler(RequestValidationError)
async def validation_error_to_400(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Invalid input -> 400 with a clear message (spec §5), instead of FastAPI's 422."""
    messages = [_error_message(e) for e in exc.errors()]
    return JSONResponse(status_code=400, content={"detail": " ".join(messages), "errors": messages})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/parcel/diagnostic", response_model=DiagnosticResponse)
async def parcel_diagnostic(body: DiagnosticRequest, request: Request) -> DiagnosticResponse:
    return await build_diagnostic(request.app.state.http, body)


@app.get("/api/weather/forecast", response_model=WeatherResponse)
async def weather_forecast(
    request: Request,
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
) -> WeatherResponse:
    return await build_forecast(request.app.state.http, lat, lon)
