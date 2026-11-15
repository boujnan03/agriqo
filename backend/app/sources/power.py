"""NASA POWER (no key): climatology + recent daily data, community AG.

Verified 2026-11-15 against https://power.larc.nasa.gov/docs/services/api/ and live calls:
- values live in properties.parameter.<PARAM>; climatology keys are JAN..DEC + ANN,
  daily keys are YYYYMMDD; header.fill_value is -999 (= missing).
- PRECTOTCORR is in mm/day (climatology too: ANN is the mean daily rate).
- climatology T2M_MAX / T2M_MIN are, per POWER's parameter manager, "the maximum / minimum
  HOURLY air temperature ... in the period of interest": RECORDS over the whole climatology
  period (currently 2001-2025), monthly values included (JUL = hottest hour of any July).
  T2M_MAX_AVG is "the average of the daily maximum ... in the period of interest": the
  typical daily high of each month. Its ANN is NOT the mean of its months (42.5 vs 31.5
  at 32.4,-6.45), so the annual figure is computed here with `mean_of_months`.
- daily data lags real time by a few days (trailing days come back as -999).
Resolution ~0.5° x 0.625° (~50 km): neighbouring parcels share the same values.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

import httpx

from app import config

CLIMATOLOGY_PARAMS = [
    "T2M",
    "T2M_MAX",
    "T2M_MAX_AVG",
    "T2M_MIN",
    "PRECTOTCORR",
    "RH2M",
    "ALLSKY_SFC_SW_DWN",
]
DAILY_PARAMS = ["GWETTOP", "GWETROOT", "T2M_MAX", "T2M_MIN", "PRECTOTCORR"]
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

# Daily window: the last 12 months. One call gives both the current soil moisture (most
# recent valid day) and a frost-day count over a full year. A 30-day window would make
# frost_days a function of the season the farmer happens to click in (always 0 in autumn).
DAILY_WINDOW_DAYS = 365


def today() -> date:
    """UTC 'today' (indirection so tests can pin the date)."""
    return datetime.now(timezone.utc).date()


def _clean(value: float | None, fill: float) -> float | None:
    if value is None or value == fill or value <= -999:
        return None
    return float(value)


@dataclass(frozen=True)
class Climatology:
    annual: dict[str, float | None]  # PARAM -> ANN value
    # PARAM -> {"JAN": v, ..., "DEC": v}. Fetched now for the future Insights monthly
    # chart; not part of the diagnostic response yet (only annual figures are).
    monthly: dict[str, dict[str, float | None]]
    period: str | None  # e.g. "2001-2025", from the response header


def mean_of_months(clim: Climatology, param: str) -> float | None:
    """Mean of the 12 monthly climatology values of `param`.

    None unless all 12 months are present: a mean over fewer months would be biased toward
    the seasons that happen to be available, so it is reported as missing instead.
    """
    months = clim.monthly.get(param, {})
    values = [months.get(m) for m in MONTHS]
    if any(v is None for v in values):
        return None
    return sum(values) / len(values)


@dataclass(frozen=True)
class DailySeries:
    # PARAM -> [(YYYYMMDD, value or None)], chronological.
    series: dict[str, list[tuple[str, float | None]]]


async def fetch_climatology(client: httpx.AsyncClient, lat: float, lon: float) -> Climatology:
    resp = await client.get(
        config.POWER_CLIMATOLOGY_URL,
        params={
            "parameters": ",".join(CLIMATOLOGY_PARAMS),
            "community": "AG",
            "latitude": lat,
            "longitude": lon,
            "format": "JSON",
        },
    )
    resp.raise_for_status()
    return parse_climatology(resp.json())


def parse_climatology(payload: dict) -> Climatology:
    fill = payload.get("header", {}).get("fill_value", -999)
    params: dict[str, dict[str, float]] = payload["properties"]["parameter"]
    annual = {p: _clean(v.get("ANN"), fill) for p, v in params.items()}
    monthly = {p: {m: _clean(v.get(m), fill) for m in MONTHS} for p, v in params.items()}
    rng = payload.get("header", {}).get("range", "")
    years = re.findall(r"\b(\d{4})\b", rng)
    period = f"{years[0]}-{years[-1]}" if len(years) >= 2 else None
    return Climatology(annual=annual, monthly=monthly, period=period)


async def fetch_daily(client: httpx.AsyncClient, lat: float, lon: float) -> DailySeries:
    end = today()
    start = end - timedelta(days=DAILY_WINDOW_DAYS)
    resp = await client.get(
        config.POWER_DAILY_URL,
        params={
            "parameters": ",".join(DAILY_PARAMS),
            "community": "AG",
            "latitude": lat,
            "longitude": lon,
            "start": start.strftime("%Y%m%d"),
            "end": end.strftime("%Y%m%d"),
            "format": "JSON",
        },
    )
    resp.raise_for_status()
    return parse_daily(resp.json())


def parse_daily(payload: dict) -> DailySeries:
    fill = payload.get("header", {}).get("fill_value", -999)
    params: dict[str, dict[str, float]] = payload["properties"]["parameter"]
    return DailySeries(
        series={p: [(d, _clean(v, fill)) for d, v in sorted(vals.items())] for p, vals in params.items()}
    )


# ------------------------------------------------------------------------ derived values


def _iso(yyyymmdd: str) -> str:
    return f"{yyyymmdd[:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:]}"


@dataclass(frozen=True)
class FrostCount:
    days: int
    start: str  # ISO date of the first valid day counted
    end: str  # ISO date of the last valid day counted


def frost_days(daily: DailySeries) -> FrostCount | None:
    """Number of days with T2M_MIN < 0 °C over the valid days of the window (spec §3.1).

    None when the window has no valid T2M_MIN at all (nothing to count, so no number).
    """
    valid = [(d, v) for d, v in daily.series.get("T2M_MIN", []) if v is not None]
    if not valid:
        return None
    return FrostCount(
        days=sum(1 for _, v in valid if v < 0.0),
        start=_iso(valid[0][0]),
        end=_iso(valid[-1][0]),
    )


# Soil-moisture label thresholds on GWETTOP (0..1). PROJECT CHOICE, not an agronomic
# standard: chosen so the spec's example (0.21 -> "sec") holds. Needs field validation.
#   sec    : GWETTOP < 0.30
#   moyen  : 0.30 <= GWETTOP < 0.60
#   humide : GWETTOP >= 0.60
MOISTURE_DRY_BELOW = 0.30
MOISTURE_WET_FROM = 0.60

# A value older than this (relative to the window end) is not "current" any more.
MOISTURE_MAX_AGE_DAYS = 30


def moisture_label(gwettop: float) -> str:
    if gwettop < MOISTURE_DRY_BELOW:
        return "sec"
    if gwettop < MOISTURE_WET_FROM:
        return "moyen"
    return "humide"


@dataclass(frozen=True)
class CurrentMoisture:
    gwettop: float
    gwetroot: float | None
    date: str  # ISO date


def current_soil_moisture(daily: DailySeries, as_of: date) -> CurrentMoisture | None:
    """Most recent valid GWETTOP, if it is at most MOISTURE_MAX_AGE_DAYS old."""
    oldest = (as_of - timedelta(days=MOISTURE_MAX_AGE_DAYS)).strftime("%Y%m%d")
    root = dict(daily.series.get("GWETROOT", []))
    for d, v in reversed(daily.series.get("GWETTOP", [])):
        if d < oldest:
            break
        if v is not None:
            return CurrentMoisture(gwettop=v, gwetroot=root.get(d), date=_iso(d))
    return None
