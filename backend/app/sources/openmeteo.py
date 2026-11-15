"""Open-Meteo forecast API (no key): today's conditions + a 7-day daily forecast.

Not a NASA source: NASA POWER is historical/climatology only and cannot forecast.

Verified 2026-11-15 against https://open-meteo.com/en/docs and a live call:
- GET /v1/forecast?latitude&longitude&daily=weather_code,temperature_2m_max,
  temperature_2m_min,precipitation_probability_max&current=temperature_2m,
  relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto&forecast_days=7
- `timezone` is required with daily variables; "auto" resolves it from the coordinates.
- daily.* are parallel arrays indexed like daily.time; values can be null.
- wind_speed_10m defaults to km/h, temperatures to °C.
- errors: HTTP 400 {"error": true, "reason": "..."}.
"""
from __future__ import annotations

from dataclasses import dataclass

import httpx

from app import config

FORECAST_DAYS = 7
DAILY_VARS = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max",
]
CURRENT_VARS = ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "weather_code"]

# WMO weather interpretation codes (table in the Open-Meteo docs) -> (condition key,
# lucide icon name). Grouping is deliberately coarse: a farmer-facing label, one icon.
_WMO: dict[int, tuple[str, str]] = {
    0: ("sunny", "sun"),  # Clear sky
    1: ("sunny", "sun"),  # Mainly clear
    2: ("partlyCloudy", "cloud-sun"),  # Partly cloudy
    3: ("cloudy", "cloud"),  # Overcast
    45: ("fog", "cloud-fog"),  # Fog
    48: ("fog", "cloud-fog"),  # Depositing rime fog
    51: ("drizzle", "cloud-drizzle"),  # Drizzle: light
    53: ("drizzle", "cloud-drizzle"),  # Drizzle: moderate
    55: ("drizzle", "cloud-drizzle"),  # Drizzle: dense
    56: ("drizzle", "cloud-drizzle"),  # Freezing drizzle: light
    57: ("drizzle", "cloud-drizzle"),  # Freezing drizzle: dense
    61: ("rain", "cloud-rain"),  # Rain: slight
    63: ("rain", "cloud-rain"),  # Rain: moderate
    65: ("rain", "cloud-rain"),  # Rain: heavy
    66: ("rain", "cloud-rain"),  # Freezing rain: light
    67: ("rain", "cloud-rain"),  # Freezing rain: heavy
    71: ("snow", "cloud-snow"),  # Snow fall: slight
    73: ("snow", "cloud-snow"),  # Snow fall: moderate
    75: ("snow", "cloud-snow"),  # Snow fall: heavy
    77: ("snow", "cloud-snow"),  # Snow grains
    80: ("showers", "cloud-drizzle"),  # Rain showers: slight (frontend draws showers so)
    81: ("showers", "cloud-drizzle"),  # Rain showers: moderate
    82: ("showers", "cloud-drizzle"),  # Rain showers: violent
    85: ("snow", "cloud-snow"),  # Snow showers: slight
    86: ("snow", "cloud-snow"),  # Snow showers: heavy
    95: ("thunderstorm", "cloud-lightning"),  # Thunderstorm
    96: ("thunderstorm", "cloud-lightning"),  # Thunderstorm with slight hail
    97: ("thunderstorm", "cloud-lightning"),  # Heavy thunderstorm (some models)
    99: ("thunderstorm", "cloud-lightning"),  # Thunderstorm with heavy hail
}
_UNKNOWN = ("unknown", "circle-help")


def condition_for(code: int | None) -> tuple[str, str]:
    """(condition key, lucide icon) for a WMO code; ("unknown", ...) if null or unlisted."""
    if code is None:
        return _UNKNOWN
    return _WMO.get(int(code), _UNKNOWN)


@dataclass(frozen=True)
class Forecast:
    timezone: str | None
    current: dict  # raw "current" object ({} if absent)
    daily: list[dict]  # one dict per day: {"date", "weather_code", "temp_max_c", ...}


async def fetch(client: httpx.AsyncClient, lat: float, lon: float) -> Forecast:
    resp = await client.get(
        config.OPENMETEO_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "daily": ",".join(DAILY_VARS),
            "current": ",".join(CURRENT_VARS),
            "timezone": "auto",
            "forecast_days": FORECAST_DAYS,
        },
    )
    resp.raise_for_status()
    return parse(resp.json())


def parse(payload: dict) -> Forecast:
    daily = payload["daily"]
    dates: list[str] = daily["time"]
    if not dates:
        raise ValueError("Open-Meteo returned no forecast days")

    def col(name: str) -> list:
        values = daily.get(name)
        if values is None:
            return [None] * len(dates)
        if len(values) != len(dates):
            raise ValueError(f"daily.{name} has {len(values)} values for {len(dates)} days")
        return values

    codes, tmax, tmin, pop = (col(v) for v in DAILY_VARS)
    days = [
        {
            "date": dates[i],
            "weather_code": codes[i],
            "temp_max_c": tmax[i],
            "temp_min_c": tmin[i],
            "precip_probability_pct": pop[i],
        }
        for i in range(len(dates))
    ]
    return Forecast(timezone=payload.get("timezone"), current=payload.get("current") or {}, daily=days)
