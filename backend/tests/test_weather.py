"""GET /api/weather/forecast: happy path, WMO mapping, unavailable state, validation."""
from __future__ import annotations

import asyncio

import httpx
import pytest

from app.sources.openmeteo import condition_for
from conftest import load, openmeteo_route

URL = "/api/weather/forecast"
TADLA = {"lat": 32.40, "lon": -6.45}


def test_forecast_happy_path(client, mock_api):
    fx = load("openmeteo_tadla.json")  # real response captured 2026-11-15
    openmeteo_route(mock_api).respond(200, json=fx)
    r = client.get(URL, params=TADLA)
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "ok" and d["source"] == "Open-Meteo"
    assert d["timezone"] == "Africa/Casablanca"

    days = d["days"]
    assert len(days) == 7
    assert [x["date"] for x in days] == fx["daily"]["time"]
    assert days[0] == {
        "date": "2026-11-15",
        "weather_code": 45,
        "condition": "fog",
        "icon": "cloud-fog",
        "temp_max_c": 21.4,
        "temp_min_c": 10.7,
        "precip_probability_pct": 0,
    }
    assert days[4]["condition"] == "cloudy" and days[4]["icon"] == "cloud"

    today = d["today"]
    assert today["date"] == "2026-11-15"
    assert today["observed_at"] == "2026-11-15T12:30"
    assert today["temp_c"] == 20.1
    assert today["weather_code"] == 3 and today["condition"] == "cloudy"
    assert today["humidity_pct"] == 66 and today["wind_kmh"] == 2.6
    assert today["temp_max_c"] == 21.4 and today["precip_probability_pct"] == 0


def test_forecast_request_parameters(client, mock_api):
    openmeteo_route(mock_api).respond(200, json=load("openmeteo_tadla.json"))
    client.get(URL, params={"lat": 32.40049, "lon": -6.45})
    p = openmeteo_route(mock_api).calls.last.request.url.params
    assert p["latitude"] == "32.4" and p["forecast_days"] == "7" and p["timezone"] == "auto"
    assert p["daily"] == (
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    )


def test_null_values_stay_null(client, mock_api):
    fx = load("openmeteo_tadla.json")
    fx["daily"]["precipitation_probability_max"][2] = None
    fx["daily"]["weather_code"][3] = None
    openmeteo_route(mock_api).respond(200, json=fx)
    days = client.get(URL, params=TADLA).json()["days"]
    assert days[2]["precip_probability_pct"] is None  # not 0
    assert days[3]["condition"] == "unknown" and days[3]["weather_code"] is None


@pytest.mark.parametrize("status_code", [500, 503, 429])
def test_forecast_unavailable_http(client, mock_api, status_code):
    openmeteo_route(mock_api).respond(status_code)
    r = client.get(URL, params=TADLA)
    assert r.status_code == 200
    d = r.json()
    assert d == {
        "status": "indisponible",
        "source": "Open-Meteo",
        "error": f"http_{status_code}",
        "location": {"lat": 32.40, "lon": -6.45},
    }  # no today, no days: nothing fabricated


def test_forecast_unavailable_timeout(client, mock_api, fast_timeout):
    async def too_slow(request):
        await asyncio.sleep(fast_timeout * 10)
        return httpx.Response(200, json=load("openmeteo_tadla.json"))

    openmeteo_route(mock_api).mock(side_effect=too_slow)
    d = client.get(URL, params=TADLA).json()
    assert d["status"] == "indisponible" and d["error"] == "timeout"
    assert "days" not in d and "today" not in d


def test_forecast_malformed_payload(client, mock_api):
    openmeteo_route(mock_api).respond(200, json={"latitude": 32.4})  # no "daily"
    d = client.get(URL, params=TADLA).json()
    assert d["status"] == "indisponible" and d["error"] == "invalid_response"


def test_forecast_cached_briefly(client, mock_api):
    openmeteo_route(mock_api).respond(200, json=load("openmeteo_tadla.json"))
    client.get(URL, params=TADLA)
    client.get(URL, params={"lat": 32.4001, "lon": -6.4501})
    assert openmeteo_route(mock_api).call_count == 1


@pytest.mark.parametrize(
    "params, field",
    [
        ({"lat": 91, "lon": 0}, "lat"),
        ({"lat": 0, "lon": -200}, "lon"),
        ({"lat": 32.4}, "lon"),
        ({"lat": "north", "lon": 0}, "lat"),
    ],
)
def test_forecast_invalid_input_400(client, mock_api, params, field):
    r = client.get(URL, params=params)
    assert r.status_code == 400
    assert field in r.json()["detail"]
    assert mock_api.calls.call_count == 0


# Every code of the WMO table in the Open-Meteo docs (verified 2026-11-15).
WMO_DOC_CODES = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
                 80, 81, 82, 85, 86, 95, 96, 97, 99]


@pytest.mark.parametrize("code", WMO_DOC_CODES)
def test_every_documented_wmo_code_is_mapped(code):
    condition, icon = condition_for(code)
    assert condition != "unknown" and icon


@pytest.mark.parametrize(
    "code, expected",
    [(0, "sunny"), (2, "partlyCloudy"), (3, "cloudy"), (45, "fog"), (53, "drizzle"),
     (63, "rain"), (81, "showers"), (73, "snow"), (95, "thunderstorm"),
     (42, "unknown"), (None, "unknown")],
)
def test_wmo_mapping(code, expected):
    assert condition_for(code)[0] == expected
