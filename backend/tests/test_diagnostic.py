"""POST /api/parcel/diagnostic: happy path, spec §5 edge cases, partial failures, cache."""
from __future__ import annotations

import asyncio
import time

import httpx
import pytest

from app import cache as cache_module
from app.diagnostic import MSG_NO_SOIL
from conftest import (
    SLOPE_PCT,
    expected_point_altitude,
    load,
    make_dem_geotiff,
    mock_all_ok,
    opentopo_route,
    power_climatology_route,
    power_daily_route,
    soilgrids_route,
)

URL = "/api/parcel/diagnostic"
TADLA = {"lat": 32.40, "lon": -6.45}


def post(client, body):
    return client.post(URL, json=body)


# ------------------------------------------------------------------------------ happy path


def test_full_diagnostic_tadla(client, mock_api):
    mock_all_ok(mock_api)
    r = post(client, {**TADLA, "polygon": None, "previous_crop": "blé"})
    assert r.status_code == 200
    d = r.json()

    assert d["location"] == {"lat": 32.40, "lon": -6.45}
    assert "recommendations" not in d  # out of scope: teammate's ML model, later

    soil = d["soil"]
    assert soil["status"] == "ok" and soil["source"] == "ISRIC SoilGrids"
    # Thickness-weighted 0-30 cm mean of the real SoilGrids payload, / d_factor 10:
    # clay (330*5 + 325*10 + 350*15) / 30 / 10 = 33.83
    assert soil["clay_pct"] == 33.8
    assert soil["sand_pct"] == 34.1
    assert soil["silt_pct"] == 32.0
    assert soil["ph"] == 7.4  # (73*5 + 74*10 + 74*15) / 30 / 10
    assert soil["organic_carbon_g_kg"] == 14.2  # (264*5 + 152*10 + 94*15) / 30 / 10
    assert soil["texture_class"] == "clay_loam"
    assert "laboratoire" in soil["note"]

    clim_fx = load("power_climatology_tadla.json")["properties"]["parameter"]
    climate = d["climate"]
    assert climate["status"] == "ok" and climate["source"] == "NASA POWER"
    assert climate["temp_mean_c"] == round(clim_fx["T2M"]["ANN"], 1)
    # Typical high = mean of the 12 monthly T2M_MAX_AVG (mean daily max), not the record.
    months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    typical_max = sum(clim_fx["T2M_MAX_AVG"][m] for m in months) / 12
    assert climate["temp_max_c"] == round(typical_max, 1) == 31.5
    assert climate["temp_max_c"] != round(clim_fx["T2M_MAX"]["ANN"], 1)  # 44.1 = record
    assert "pas un record" in climate["note"]
    assert climate["rain_mm_year"] == round(clim_fx["PRECTOTCORR"]["ANN"] * 365.25)
    assert climate["climatology_period"] == "2001-2025"

    # frost_days = count of valid T2M_MIN < 0 in the real 12-month daily payload.
    tmin = load("power_daily_tadla.json")["properties"]["parameter"]["T2M_MIN"]
    valid = {k: v for k, v in tmin.items() if v != -999}
    assert climate["frost_days"] == sum(1 for v in valid.values() if v < 0)
    assert climate["frost_days_period"] == {"start": "2025-11-15", "end": "2026-11-12"}

    moisture = d["soil_moisture"]
    assert moisture["status"] == "ok" and moisture["source"] == "NASA POWER"
    # Last 3 days of the real payload are -999 (POWER lag): latest valid is 2026-11-12.
    assert moisture["date"] == "2026-11-12"
    assert moisture["gwettop"] == 0.49 and moisture["label"] == "moyen"

    terrain = d["terrain"]
    assert terrain["status"] == "ok" and terrain["source"] == "OpenTopography"
    assert terrain["altitude"] == expected_point_altitude(32.40, -6.45)
    assert terrain["slope_pct"] == pytest.approx(SLOPE_PCT, abs=0.1)


def test_response_shape_matches_spec(client, mock_api):
    """Every field the spec's §4 example defines is present, per block (except the
    out-of-scope recommendations)."""
    mock_all_ok(mock_api)
    d = post(client, TADLA).json()
    assert set(d) == {"location", "soil", "climate", "soil_moisture", "terrain"}
    assert {"status", "source", "texture_class", "clay_pct", "sand_pct", "silt_pct", "ph",
            "organic_carbon_g_kg", "note"} <= set(d["soil"])
    assert {"status", "source", "temp_mean_c", "temp_max_c", "rain_mm_year",
            "frost_days"} <= set(d["climate"])
    assert {"status", "source", "gwettop", "label"} <= set(d["soil_moisture"])
    assert {"status", "source", "altitude", "slope_pct"} <= set(d["terrain"])


def test_upstream_queried_with_rounded_coordinates(client, mock_api):
    mock_all_ok(mock_api)
    post(client, {"lat": 32.400449, "lon": -6.449951})
    sg = soilgrids_route(mock_api).calls.last.request.url.params
    assert sg["lat"] == "32.4" and sg["lon"] == "-6.45"
    assert sg.get_list("property") == ["clay", "sand", "silt", "phh2o", "soc"]
    pw = power_daily_route(mock_api).calls.last.request.url.params
    assert pw["community"] == "AG" and pw["start"] == "20251115" and pw["end"] == "20261115"
    ot = opentopo_route(mock_api).calls.last.request.url.params
    assert ot["demtype"] == "SRTMGL1" and ot["API_Key"] == "test-key"
    assert float(ot["south"]) < 32.4 < float(ot["north"])


# -------------------------------------------------------------- spec §5 edge case 1: input


@pytest.mark.parametrize(
    "body, field",
    [
        ({"lat": 95, "lon": -6.36}, "lat"),
        ({"lat": -90.5, "lon": 0}, "lat"),
        ({"lat": 32.34, "lon": 181}, "lon"),
        ({"lat": 32.34, "lon": -180.01}, "lon"),
        ({"lon": -6.36}, "lat"),
        ({"lat": "abc", "lon": -6.36}, "lat"),
    ],
)
def test_invalid_coordinates_400(client, mock_api, body, field):
    r = post(client, body)
    assert r.status_code == 400
    assert field in r.json()["detail"]
    assert mock_api.calls.call_count == 0  # rejected before any upstream call


def test_out_of_range_message_is_clear(client, mock_api):
    r = post(client, {"lat": 95, "lon": -6.36})
    assert r.json()["detail"] == "lat doit être compris entre -90 et 90 (reçu : 95)."


# ------------------------------------------------- spec §5 edge cases 2 & 3: water, urban

# Real SoilGrids answers captured at the spec's own example coordinates: all-null means.
@pytest.mark.parametrize(
    "lat, lon, fixture",
    [
        (33.00, -9.50, "soilgrids_ocean.json"),  # Océan Atlantique
        (32.10, -6.45, "soilgrids_bin_el_ouidane.json"),  # Barrage Bin el Ouidane
        (33.59, -7.62, "soilgrids_casablanca.json"),  # Casablanca centre (urban)
    ],
)
def test_water_and_urban_points_have_no_soil(client, mock_api, lat, lon, fixture):
    mock_all_ok(mock_api, lat, lon, soil_fixture=fixture)
    r = post(client, {"lat": lat, "lon": lon})
    assert r.status_code == 200
    d = r.json()
    assert d["soil"] == {
        "status": "pas_de_donnees",
        "source": "ISRIC SoilGrids",
        "message": MSG_NO_SOIL,
    }
    # The rest of the diagnostic still shows.
    assert d["climate"]["status"] == "ok"
    assert d["soil_moisture"]["status"] == "ok"
    assert d["terrain"]["status"] == "ok"


# ------------------------------------------------------ spec §5 edge case 4: desert / rock


def test_sahara_shows_available_soil_data(client, mock_api):
    """Real SoilGrids answer at the spec's Sahara point (30.00, -5.00) does have values."""
    mock_all_ok(mock_api, 30.00, -5.00, soil_fixture="soilgrids_sahara.json")
    d = post(client, {"lat": 30.00, "lon": -5.00}).json()
    assert d["soil"]["status"] == "ok"
    assert d["soil"]["texture_class"] == "sandy_clay_loam"
    assert d["soil"]["ph"] == 8.2


def test_bare_rock_partial_data_no_crash(client, mock_api):
    """Rock: no soil and no DEM values -> those blocks flagged, climate/moisture still shown."""
    power_climatology_route(mock_api).respond(200, json=load("power_climatology_tadla.json"))
    power_daily_route(mock_api).respond(200, json=load("power_daily_tadla.json"))
    soilgrids_route(mock_api).respond(200, json=load("soilgrids_ocean.json"))  # all null
    opentopo_route(mock_api).respond(200, content=make_dem_geotiff(30.0, -5.0, nodata_all=True))
    r = post(client, {"lat": 30.00, "lon": -5.00})
    assert r.status_code == 200
    d = r.json()
    assert d["soil"]["status"] == "pas_de_donnees" and d["soil"]["message"] == MSG_NO_SOIL
    assert d["terrain"]["status"] == "pas_de_donnees"
    assert "altitude" not in d["terrain"]  # no invented value
    assert d["climate"]["status"] == "ok" and d["soil_moisture"]["status"] == "ok"


def test_partial_soil_keeps_values_and_nulls_the_rest(client, mock_api):
    """Only pH known: soil is ok with pH, texture is null (not guessed)."""
    payload = load("soilgrids_tadla.json")
    for layer in payload["properties"]["layers"]:
        if layer["name"] != "phh2o":
            for depth in layer["depths"]:
                depth["values"]["mean"] = None
    mock_all_ok(mock_api)
    soilgrids_route(mock_api).respond(200, json=payload)
    soil = post(client, TADLA).json()["soil"]
    assert soil["status"] == "ok" and soil["ph"] == 7.4
    assert soil["texture_class"] is None and soil["clay_pct"] is None


def test_opentopography_204_is_no_data(client, mock_api):
    mock_all_ok(mock_api)
    opentopo_route(mock_api).respond(204)
    t = post(client, TADLA).json()["terrain"]
    assert t["status"] == "pas_de_donnees" and "altitude" not in t


# ------------------------------------------------- spec §5 edge case 5: slow / down API

SOURCES = {
    "soilgrids": (soilgrids_route, "soil"),
    "power_climatology": (power_climatology_route, "climate"),
    "power_daily": (power_daily_route, "soil_moisture"),
    "opentopography": (opentopo_route, "terrain"),
}


def _others_ok(d: dict, failed_block: str, failed_source: str) -> None:
    expected_ok = {"soil", "climate", "soil_moisture", "terrain"} - {failed_block}
    for block in expected_ok:
        assert d[block]["status"] == "ok", (block, d[block])


@pytest.mark.parametrize("source", SOURCES)
def test_one_slow_api_times_out_others_return(client, mock_api, fast_timeout, source):
    route, block = SOURCES[source]
    mock_all_ok(mock_api)

    async def too_slow(request):
        await asyncio.sleep(fast_timeout * 10)
        return httpx.Response(200, json={})

    route(mock_api).mock(side_effect=too_slow)
    start = time.perf_counter()
    r = post(client, TADLA)
    elapsed = time.perf_counter() - start

    assert r.status_code == 200
    d = r.json()
    expected = {"status": "indisponible", "source": d[block]["source"], "error": "timeout"}
    if source == "soilgrids":
        expected["retry_pending"] = True  # a background re-fetch was started (Part 2)
    assert d[block] == expected
    _others_ok(d, block, source)
    assert elapsed < fast_timeout * 5  # bounded by the per-call timeout, not the slow API


@pytest.mark.parametrize("source", SOURCES)
def test_one_api_down_others_return(client, mock_api, source):
    route, block = SOURCES[source]
    mock_all_ok(mock_api)
    route(mock_api).respond(503)
    d = post(client, TADLA).json()
    assert d[block]["status"] == "indisponible" and d[block]["error"] == "http_503"
    _others_ok(d, block, source)


@pytest.mark.parametrize(
    "failure, error",
    [
        (httpx.ConnectError("refused"), "network_error"),
        (httpx.ReadTimeout("slow"), "timeout"),
    ],
)
def test_network_failures_are_reported(client, mock_api, failure, error):
    mock_all_ok(mock_api)
    soilgrids_route(mock_api).mock(side_effect=failure)
    soil = post(client, TADLA).json()["soil"]
    assert soil["status"] == "indisponible" and soil["error"] == error


def test_garbage_payload_is_invalid_response(client, mock_api):
    mock_all_ok(mock_api)
    soilgrids_route(mock_api).respond(200, json={"unexpected": True})
    opentopo_route(mock_api).respond(200, content=b"<error>not a tiff</error>")
    d = post(client, TADLA).json()
    assert d["soil"]["error"] == "invalid_response"
    assert d["terrain"]["error"] == "invalid_response"
    assert d["climate"]["status"] == "ok"


def test_everything_down_still_200(client, mock_api):
    for route in (power_climatology_route, power_daily_route, soilgrids_route, opentopo_route):
        route(mock_api).respond(500)
    r = post(client, TADLA)
    assert r.status_code == 200
    for block in ("soil", "climate", "soil_moisture", "terrain"):
        assert r.json()[block]["status"] == "indisponible"


def test_missing_opentopo_key_skips_call(client, mock_api, monkeypatch):
    monkeypatch.delenv("OPENTOPO_API_KEY")
    mock_all_ok(mock_api)
    d = post(client, TADLA).json()
    assert d["terrain"] == {
        "status": "indisponible", "source": "OpenTopography", "error": "missing_api_key"
    }
    assert opentopo_route(mock_api).call_count == 0


def test_daily_down_nulls_frost_days_only(client, mock_api):
    mock_all_ok(mock_api)
    power_daily_route(mock_api).respond(502)
    d = post(client, TADLA).json()
    assert d["climate"]["status"] == "ok"
    assert d["climate"]["frost_days"] is None  # explicit null, never a guess
    assert d["climate"]["temp_mean_c"] is not None
    assert "frost_days indisponible" in d["climate"]["note"]
    assert d["soil_moisture"]["status"] == "indisponible"


def test_temp_max_null_when_a_month_is_missing(client, mock_api):
    """A mean over 11 months would be biased by season: report it missing instead."""
    payload = load("power_climatology_tadla.json")
    payload["properties"]["parameter"]["T2M_MAX_AVG"]["JUL"] = -999.0
    mock_all_ok(mock_api)
    power_climatology_route(mock_api).respond(200, json=payload)
    climate = post(client, TADLA).json()["climate"]
    assert climate["status"] == "ok"
    assert climate["temp_max_c"] is None
    assert climate["temp_mean_c"] is not None


def test_stale_soil_moisture_is_no_data(client, mock_api):
    """No valid GWETTOP in the last 30 days -> pas_de_donnees, not an old value as 'current'."""
    payload = load("power_daily_tadla.json")
    for day in payload["properties"]["parameter"]["GWETTOP"]:
        if day >= "20261016":
            payload["properties"]["parameter"]["GWETTOP"][day] = -999.0
    mock_all_ok(mock_api)
    power_daily_route(mock_api).respond(200, json=payload)
    m = post(client, TADLA).json()["soil_moisture"]
    assert m["status"] == "pas_de_donnees" and "gwettop" not in m


# ----------------------------------------------------------------------------------- cache


def test_cache_hit_by_rounded_coordinates(client, mock_api):
    mock_all_ok(mock_api)
    post(client, {"lat": 32.40001, "lon": -6.45002})
    post(client, {"lat": 32.40004, "lon": -6.44998})  # same point at 3 decimals
    for route in (power_climatology_route, power_daily_route, soilgrids_route, opentopo_route):
        assert route(mock_api).call_count == 1


def test_failures_are_not_cached(client, mock_api):
    mock_all_ok(mock_api)
    soilgrids_route(mock_api).mock(
        side_effect=[httpx.Response(503), httpx.Response(200, json=load("soilgrids_tadla.json"))]
    )
    assert post(client, TADLA).json()["soil"]["status"] == "indisponible"
    assert post(client, TADLA).json()["soil"]["status"] == "ok"  # retried, not stuck
    assert soilgrids_route(mock_api).call_count == 2


def test_no_data_answers_are_cached(client, mock_api):
    mock_all_ok(mock_api, soil_fixture="soilgrids_ocean.json")
    post(client, TADLA)
    post(client, TADLA)
    assert soilgrids_route(mock_api).call_count == 1


def test_ttls_reflect_how_fast_each_source_changes():
    ttl = cache_module.TTL_S
    assert ttl["openmeteo"] < ttl["power_daily"] < ttl["power_climatology"]
    assert ttl["soilgrids"] == ttl["opentopography"] == ttl["power_climatology"]


# ------------------------------------------------------------------------- drawn polygon

# A ~110 m square around the Tadla point; GeoJSON order [lon, lat], closed ring.
SQUARE = [[-6.4505, 32.3995], [-6.4495, 32.3995], [-6.4495, 32.4005], [-6.4505, 32.4005]]
SQUARE_RING = SQUARE + [SQUARE[0]]


def polygon_body(ring=SQUARE_RING, lat=32.40, lon=-6.45):
    return {"lat": lat, "lon": lon, "polygon": {"type": "Polygon", "coordinates": [ring]}}


def test_polygon_point_sources_use_centroid_terrain_uses_extent(client, mock_api):
    mock_all_ok(mock_api)
    r = post(client, polygon_body())
    assert r.status_code == 200
    # Point-based sources: the centroid (the request's lat/lon), nothing else.
    sg = soilgrids_route(mock_api).calls.last.request.url.params
    assert (sg["lat"], sg["lon"]) == ("32.4", "-6.45")
    pw = power_daily_route(mock_api).calls.last.request.url.params
    assert (pw["latitude"], pw["longitude"]) == ("32.4", "-6.45")
    # OpenTopography: exactly the polygon's extent, not the ~500 m default box.
    ot = opentopo_route(mock_api).calls.last.request.url.params
    assert float(ot["south"]) == 32.3995 and float(ot["north"]) == 32.4005
    assert float(ot["west"]) == -6.4505 and float(ot["east"]) == -6.4495
    assert r.json()["terrain"]["note"].endswith("Pente moyenne sur la parcelle dessinée.")


def _dem_flat_west_steep_east(lat: float, lon: float, size: int = 21) -> bytes:
    """Flat (400 m) on the western half, a 20 % slope on the eastern half."""
    import io

    import numpy as np
    import rasterio
    from rasterio.transform import from_origin

    from conftest import RES_DEG

    dx_m = RES_DEG * 111_320.0 * np.cos(np.radians(lat))
    grid = np.full((size, size), 400.0, dtype="float32")
    for c in range(size // 2, size):
        grid[:, c] = 400.0 + 0.20 * (c - size // 2) * dx_m
    buf = io.BytesIO()
    west, north = lon - (size / 2) * RES_DEG, lat + (size / 2) * RES_DEG
    with rasterio.open(
        buf, "w", driver="GTiff", width=size, height=size, count=1, dtype="float32",
        crs="EPSG:4326", transform=from_origin(west, north, RES_DEG, RES_DEG), nodata=-32768,
    ) as ds:
        ds.write(grid, 1)
    return buf.getvalue()


def test_polygon_slope_is_averaged_inside_the_parcel_only(client, mock_api):
    """Same raster: the default box mixes flat and steep land; a parcel drawn on the flat
    western half must get 0 % slope, not the box average."""
    from conftest import RES_DEG

    lat, lon = 32.40, -6.45
    dem = _dem_flat_west_steep_east(lat, lon)
    mock_all_ok(mock_api)
    opentopo_route(mock_api).respond(200, content=dem)

    whole_box = post(client, TADLA).json()["terrain"]
    assert whole_box["slope_pct"] > 5  # the box average includes the steep half

    # A parcel well inside the flat western half (pixels 2..6 of 21 west of centre).
    w, e = lon - 8 * RES_DEG, lon - 4 * RES_DEG
    s_, n = lat - 2 * RES_DEG, lat + 2 * RES_DEG
    ring = [[w, s_], [e, s_], [e, n], [w, n], [w, s_]]
    centroid = {"lat": (s_ + n) / 2, "lon": (w + e) / 2}
    parcel = post(client, polygon_body(ring, **centroid)).json()["terrain"]
    assert parcel["status"] == "ok"
    assert parcel["slope_pct"] == 0.0


@pytest.mark.parametrize(
    "polygon, needle",
    [
        ({"type": "Polygon", "coordinates": [SQUARE]}, "fermé"),  # open ring
        ({"type": "Polygon", "coordinates": [SQUARE_RING[:2] + [SQUARE_RING[0]]]}, "3 coins"),
        ({"type": "Polygon", "coordinates": [SQUARE_RING, SQUARE_RING]}, "trous"),
        ({"type": "Point", "coordinates": [-6.45, 32.4]}, "Polygone invalide"),
        ({"type": "Polygon", "coordinates": [[[200, 32.4], [-6.4, 32.4], [-6.4, 32.5], [200, 32.4]]]},
         "hors limites"),
    ],
)
def test_invalid_polygon_400(client, mock_api, polygon, needle):
    r = post(client, {"lat": 32.40, "lon": -6.45, "polygon": polygon})
    assert r.status_code == 400
    assert needle in r.json()["detail"]
    assert mock_api.calls.call_count == 0


def test_point_outside_polygon_extent_400(client, mock_api):
    r = post(client, polygon_body(lat=33.0, lon=-6.45))
    assert r.status_code == 400
    assert "centre du polygone" in r.json()["detail"]
    assert mock_api.calls.call_count == 0


def test_terrain_cache_is_keyed_by_polygon_point_sources_by_centroid(client, mock_api):
    mock_all_ok(mock_api)
    other = [[-6.4510, 32.3990], [-6.4490, 32.3990], [-6.4490, 32.4010], [-6.4510, 32.4010]]
    post(client, polygon_body())
    post(client, polygon_body())  # same parcel: everything cached
    post(client, polygon_body(other + [other[0]]))  # same centroid, different shape
    assert opentopo_route(mock_api).call_count == 2
    assert soilgrids_route(mock_api).call_count == 1
    assert power_daily_route(mock_api).call_count == 1
