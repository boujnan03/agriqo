"""In-memory cache keyed by (source, lat, lon) with coordinates rounded to 3 decimals.

3 decimals is ~110 m of latitude: finer than every source we call (POWER ~50 km, SoilGrids
250 m, SRTM 30 m but averaged over a ~500 m box, Open-Meteo ~1-11 km), so two clicks on
the same field share one entry. Callers also QUERY the APIs with the rounded coordinates,
so a cached value is exactly what a fresh call would have been asked for.

How long each value can be trusted is set PER SOURCE, not per endpoint, because the
sources age very differently:
- soil (SoilGrids), relief (SRTM) and POWER climatology (fixed 2001-2025 period) are
  static products: a cached value stays correct for weeks.
- POWER daily (current soil moisture, last-12-month frost count) gains one new day of
  data per day, a few days behind real time: hours.
- the Open-Meteo forecast and its "current" conditions are re-run many times a day:
  well under an hour.
A single TTL for the whole diagnostic response would either serve stale soil moisture or
refetch static soil data for nothing, hence the per-source TTLs below.

Only real answers are cached (`ok` and `pas_de_donnees`). Failures (`indisponible`) are
never cached, so a one-off timeout is retried on the next request instead of sticking.

ACCEPTED MVP LIMITATION: this is a plain process-local dict. It is lost on every restart
and not shared between workers. That is deliberate for the hackathon (no database, one
uvicorn worker), not an oversight; a shared store (SQLite/Redis) is the next step if the
upstream APIs ever rate-limit us. Two concurrent first requests for the same point may
both call upstream; harmless at this scale.
"""
from __future__ import annotations

import time
from collections import OrderedDict
from typing import Any

DAY_S = 24 * 3600

# Time-to-live per source namespace, in seconds (see module docstring for the reasoning).
TTL_S: dict[str, float] = {
    "soilgrids": 30 * DAY_S,
    "opentopography": 30 * DAY_S,
    "power_climatology": 30 * DAY_S,
    "power_daily": 6 * 3600,
    "openmeteo": 30 * 60,
}

# Safety cap so a long-running demo cannot grow memory without bound (oldest evicted first).
MAX_ENTRIES = 5000


def round_coord(value: float) -> float:
    return round(value, 3)


def cache_key(namespace: str, lat: float, lon: float) -> tuple[str, float, float]:
    return (namespace, round_coord(lat), round_coord(lon))


class TTLCache:
    def __init__(self, max_entries: int = MAX_ENTRIES) -> None:
        self._data: OrderedDict[tuple[str, float, float], tuple[float, Any]] = OrderedDict()
        self._max = max_entries

    def get(self, namespace: str, lat: float, lon: float) -> Any | None:
        key = cache_key(namespace, lat, lon)
        hit = self._data.get(key)
        if hit is None:
            return None
        expires_at, value = hit
        if time.monotonic() >= expires_at:
            del self._data[key]
            return None
        return value

    def set(self, namespace: str, lat: float, lon: float, value: Any) -> None:
        key = cache_key(namespace, lat, lon)
        self._data[key] = (time.monotonic() + TTL_S[namespace], value)
        self._data.move_to_end(key)
        while len(self._data) > self._max:
            self._data.popitem(last=False)

    def clear(self) -> None:
        self._data.clear()

    def __len__(self) -> int:
        return len(self._data)


# Process-wide instance shared by both endpoints.
cache = TTLCache()
