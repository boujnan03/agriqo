"""GET /api/weather/forecast: today's conditions + 7-day forecast from Open-Meteo.

If Open-Meteo fails or times out, the response says `indisponible` and carries NO forecast
values: never a made-up or stale-looking placeholder.
"""
from __future__ import annotations

import httpx

from app.cache import round_coord
from app.models import Location, WeatherDay, WeatherResponse, WeatherToday
from app.sources import openmeteo
from app.sources._runner import run_source

SRC_WEATHER = "Open-Meteo"


async def build_forecast(client: httpx.AsyncClient, lat: float, lon: float) -> WeatherResponse:
    qlat, qlon = round_coord(lat), round_coord(lon)
    outcome = await run_source(
        "openmeteo", qlat, qlon, lambda: openmeteo.fetch(client, qlat, qlon)
    )
    location = Location(lat=lat, lon=lon)
    if outcome.status != "ok":
        return WeatherResponse(
            status="indisponible", source=SRC_WEATHER, location=location, error=outcome.error
        )

    fc: openmeteo.Forecast = outcome.data
    days = []
    for d in fc.daily:
        condition, icon = openmeteo.condition_for(d["weather_code"])
        days.append(WeatherDay(condition=condition, icon=icon, **d))

    first = fc.daily[0]
    cur = fc.current
    # "Now" uses the current conditions when present; otherwise today's daily code.
    code = cur.get("weather_code", first["weather_code"])
    condition, icon = openmeteo.condition_for(code)
    today = WeatherToday(
        date=first["date"],
        observed_at=cur.get("time"),
        temp_c=cur.get("temperature_2m"),
        weather_code=code,
        condition=condition,
        icon=icon,
        humidity_pct=cur.get("relative_humidity_2m"),
        wind_kmh=cur.get("wind_speed_10m"),
        temp_max_c=first["temp_max_c"],
        temp_min_c=first["temp_min_c"],
        precip_probability_pct=first["precip_probability_pct"],
    )
    return WeatherResponse(
        status="ok",
        source=SRC_WEATHER,
        location=location,
        timezone=fc.timezone,
        today=today,
        days=days,
    )
