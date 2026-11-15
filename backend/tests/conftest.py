"""Shared test setup.

NO NETWORK: every external HTTP call is mocked with respx, and a socket-level guard records
(and blocks) any attempt to resolve or connect to a non-loopback host. A test that tried to
reach the network fails at teardown, even if the code under test swallowed the error (which
run_source does by design: it turns every failure into `indisponible`).
"""
from __future__ import annotations

import io
import json
import math
import socket
from datetime import date
from pathlib import Path

import numpy as np
import pytest
import rasterio
import respx
from fastapi.testclient import TestClient
from rasterio.transform import from_origin

from app import config
from app.cache import cache
from app.main import app
from app.sources import power

FIXTURES = Path(__file__).parent / "fixtures"
TODAY = date(2026, 11, 15)  # the day the real fixtures were captured

_LOOPBACK = {"127.0.0.1", "::1", "localhost", "0.0.0.0", ""}
network_attempts: list[str] = []


def _host_of(address: object) -> str:
    if isinstance(address, tuple) and address:
        return str(address[0])
    return str(address)


@pytest.fixture(autouse=True)
def no_network(monkeypatch: pytest.MonkeyPatch):
    """Block + record real network use. Loopback stays allowed (asyncio's self-pipe on
    Windows is a localhost socket pair)."""
    real_connect = socket.socket.connect
    real_connect_ex = socket.socket.connect_ex
    real_getaddrinfo = socket.getaddrinfo

    def guarded_connect(self, address):
        if _host_of(address) not in _LOOPBACK:
            network_attempts.append(f"connect {address}")
            raise OSError(f"network disabled in tests: connect to {address}")
        return real_connect(self, address)

    def guarded_connect_ex(self, address):
        if _host_of(address) not in _LOOPBACK:
            network_attempts.append(f"connect_ex {address}")
            raise OSError(f"network disabled in tests: connect to {address}")
        return real_connect_ex(self, address)

    def guarded_getaddrinfo(host, *args, **kwargs):
        if str(host) not in _LOOPBACK:
            network_attempts.append(f"getaddrinfo {host}")
            raise OSError(f"network disabled in tests: DNS lookup of {host}")
        return real_getaddrinfo(host, *args, **kwargs)

    monkeypatch.setattr(socket.socket, "connect", guarded_connect)
    monkeypatch.setattr(socket.socket, "connect_ex", guarded_connect_ex)
    monkeypatch.setattr(socket, "getaddrinfo", guarded_getaddrinfo)
    network_attempts.clear()
    yield network_attempts
    attempts = list(network_attempts)
    network_attempts.clear()
    assert not attempts, f"test tried to use the network: {attempts}"


@pytest.fixture(autouse=True)
def _isolated_state(monkeypatch: pytest.MonkeyPatch):
    cache.clear()
    monkeypatch.setattr(power, "today", lambda: TODAY)
    monkeypatch.setenv("OPENTOPO_API_KEY", "test-key")
    yield
    cache.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def mock_api():
    """respx router: any request without a matching route raises (never hits the wire)."""
    with respx.mock(assert_all_called=False, assert_all_mocked=True) as router:
        yield router


def load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


# Route patterns (host + path, any query string).
def power_climatology_route(router: respx.MockRouter):
    return router.get(host="power.larc.nasa.gov", path="/api/temporal/climatology/point")


def power_daily_route(router: respx.MockRouter):
    return router.get(host="power.larc.nasa.gov", path="/api/temporal/daily/point")


def soilgrids_route(router: respx.MockRouter):
    return router.get(host="rest.isric.org", path="/soilgrids/v2.0/properties/query")


def opentopo_route(router: respx.MockRouter):
    return router.get(host="portal.opentopography.org", path="/API/globaldem")


def openmeteo_route(router: respx.MockRouter):
    return router.get(host="api.open-meteo.com", path="/v1/forecast")


# Synthetic DEM: a plane rising eastwards at exactly SLOPE_PCT, sampled like SRTM GL1.
SLOPE_PCT = 5.0
BASE_ALT_M = 400.0
RES_DEG = 1 / 3600  # 1 arc-second


def make_dem_geotiff(lat: float, lon: float, size: int = 19, nodata_all: bool = False) -> bytes:
    dx_m = RES_DEG * 111_320.0 * math.cos(math.radians(lat))
    cols = np.arange(size, dtype="float64")
    z = BASE_ALT_M + (SLOPE_PCT / 100.0) * cols * dx_m
    grid = np.tile(z, (size, 1)).astype("float32")
    if nodata_all:
        grid[:] = -32768
    west = lon - (size / 2) * RES_DEG
    north = lat + (size / 2) * RES_DEG
    buf = io.BytesIO()
    with rasterio.open(
        buf,
        "w",
        driver="GTiff",
        width=size,
        height=size,
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=from_origin(west, north, RES_DEG, RES_DEG),
        nodata=-32768,
    ) as ds:
        ds.write(grid, 1)
    return buf.getvalue()


def expected_point_altitude(lat: float, lon: float, size: int = 19) -> int:
    """Altitude of the synthetic DEM pixel containing (lat, lon)."""
    west = lon - (size / 2) * RES_DEG
    col = int((lon - west) / RES_DEG)
    dx_m = RES_DEG * 111_320.0 * math.cos(math.radians(lat))
    return round(BASE_ALT_M + (SLOPE_PCT / 100.0) * col * dx_m)


def mock_all_ok(router: respx.MockRouter, lat: float = 32.40, lon: float = -6.45,
                soil_fixture: str = "soilgrids_tadla.json") -> None:
    """Every diagnostic source answers normally (real captured payloads + synthetic DEM)."""
    power_climatology_route(router).respond(200, json=load("power_climatology_tadla.json"))
    power_daily_route(router).respond(200, json=load("power_daily_tadla.json"))
    soilgrids_route(router).respond(200, json=load(soil_fixture))
    opentopo_route(router).respond(
        200, content=make_dem_geotiff(round(lat, 3), round(lon, 3)),
        headers={"Content-Type": "image/tiff"},
    )


@pytest.fixture
def fast_timeout(monkeypatch: pytest.MonkeyPatch) -> float:
    """Shrink the 15 s per-call limit so timeout tests run in well under a second."""
    monkeypatch.setattr(config, "EXTERNAL_TIMEOUT_S", 0.2)
    return 0.2
