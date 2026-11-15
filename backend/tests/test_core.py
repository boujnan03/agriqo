"""/health, the USDA texture triangle, soil-moisture labels, cache, and the network guard."""
from __future__ import annotations

import socket

import httpx
import pytest

from app.cache import TTLCache
from app.soil_texture import usda_texture_class
from app.sources.power import DailySeries, frost_days, moisture_label

CLASSES = {
    "clay", "silty_clay", "sandy_clay", "clay_loam", "silty_clay_loam", "sandy_clay_loam",
    "loam", "silt_loam", "sandy_loam", "silt", "loamy_sand", "sand",
}


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"status": "ok", "seasonsModel": "ok"}


# (sand, silt, clay) -> class, one point well inside each USDA region.
@pytest.mark.parametrize(
    "sand, silt, clay, expected",
    [
        (92, 4, 4, "sand"),
        (82, 10, 8, "loamy_sand"),
        (65, 25, 10, "sandy_loam"),
        (40, 40, 20, "loam"),
        (20, 65, 15, "silt_loam"),
        (5, 90, 5, "silt"),
        (60, 15, 25, "sandy_clay_loam"),
        (30, 35, 35, "clay_loam"),
        (10, 55, 35, "silty_clay_loam"),
        (50, 10, 40, "sandy_clay"),
        (10, 45, 45, "silty_clay"),
        (20, 20, 60, "clay"),
    ],
)
def test_usda_texture_regions(sand, silt, clay, expected):
    assert usda_texture_class(sand=sand, silt=silt, clay=clay) == expected


def test_texture_normalises_inputs_not_summing_to_100():
    assert usda_texture_class(sand=80, silt=80, clay=40) == usda_texture_class(40, 40, 20)


def test_texture_triangle_has_no_gaps():
    """Every integer composition maps to exactly one known class (no gap, no crash)."""
    for clay in range(0, 101):
        for silt in range(0, 101 - clay):
            assert usda_texture_class(sand=100 - clay - silt, silt=silt, clay=clay) in CLASSES


@pytest.mark.parametrize(
    "gwettop, label",
    [(0.0, "sec"), (0.21, "sec"), (0.2999, "sec"), (0.30, "moyen"), (0.49, "moyen"),
     (0.5999, "moyen"), (0.60, "humide"), (1.0, "humide")],
)
def test_moisture_labels(gwettop, label):
    assert moisture_label(gwettop) == label


def test_cache_expires(monkeypatch):
    import app.cache as cache_module

    clock = [1000.0]
    monkeypatch.setattr(cache_module.time, "monotonic", lambda: clock[0])
    c = TTLCache()
    c.set("openmeteo", 32.40001, -6.45, "v")
    assert c.get("openmeteo", 32.4, -6.45) == "v"
    clock[0] += cache_module.TTL_S["openmeteo"] + 1
    assert c.get("openmeteo", 32.4, -6.45) is None


def test_cache_is_bounded():
    c = TTLCache(max_entries=3)
    for i in range(5):
        c.set("soilgrids", i, 0, i)
    assert len(c) == 3 and c.get("soilgrids", 0, 0) is None and c.get("soilgrids", 4, 0) == 4


def test_network_guard_blocks_real_calls(no_network):
    """Proves the guard is active: an unmocked real request is blocked AND recorded."""
    with pytest.raises(httpx.ConnectError):
        httpx.get("https://power.larc.nasa.gov/", timeout=2)
    with pytest.raises(OSError):
        socket.create_connection(("8.8.8.8", 53), timeout=2)
    assert any("power.larc.nasa.gov" in a for a in no_network)
    assert any("8.8.8.8" in a for a in no_network)
    no_network.clear()  # expected attempts: don't fail this test's teardown


def _series(tmin: list[float | None]) -> DailySeries:
    return DailySeries(series={"T2M_MIN": [(f"202601{i + 1:02d}", v) for i, v in enumerate(tmin)]})


def test_frost_days_strictly_below_zero_and_skips_missing():
    # -0.1 counts; exactly 0.0 does not (spec: T2M_MIN < 0 °C); missing days are skipped.
    fc = frost_days(_series([None, -0.1, 0.0, 3.2, -4.0, None]))
    assert fc.days == 2
    assert (fc.start, fc.end) == ("2026-01-02", "2026-01-05")


def test_frost_days_none_when_no_valid_day():
    assert frost_days(_series([None, None])) is None
