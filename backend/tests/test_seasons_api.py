"""GET /api/seasons/zone and /health with the season model (spec §6.5, §12)."""
from __future__ import annotations

import shutil
from pathlib import Path
from unittest import mock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.seasons import store as store_module
from app.seasons.store import MODEL_DIR, RUNTIME_FILES, SeasonStore, load_store
from conftest import load

URL = "/api/seasons/zone"


def test_tadla_matches_the_spec_example(client):
    """The full §6.5 example (lat=32.34, lon=-6.36, water=pluvial), value for value. The API
    adds nearestCell (= cell for ok/proche) and maxDistanceDeg, which the example omits."""
    body = client.get(URL, params={"lat": 32.34, "lon": -6.36, "water": "pluvial"}).json()
    nearest, max_dist = body.pop("nearestCell"), body.pop("maxDistanceDeg")
    assert body == load("seasons_zone_c057_spec.json")
    assert nearest == {k: body["cell"][k] for k in ("id", "lat", "lon", "distanceDeg")}
    assert max_dist == 0.5


def test_tadla_key_values(client):
    r = client.get(URL, params={"lat": 32.34, "lon": -6.36})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and body["query"]["water"] == "pluvial"  # default
    assert body["cell"]["id"] == "C057"
    assert body["normals"]["rainMm"] == pytest.approx(458.6, abs=0.051)
    assert body["lastSeason"] == body["history"][-1]
    assert body["lastSeason"]["rainPctNormal"] == 81
    assert body["counts"]["recent"]["byType"]["dry_hot"] == 9
    assert body["counts"]["before"]["byType"]["dry_hot"] == 3
    assert [h["season"] for h in body["history"]] == list(range(2016, 2026))
    assert [h["type"] for h in body["history"]] == [
        "dry_hot", "dry_hot", "normal_cool", "dry_hot", "dry_hot",
        "dry_hot", "dry_hot", "dry_hot", "dry_hot", "dry_hot",
    ]
    assert len(body["advice"]) == 5


def test_irrigated_query(client):
    body = client.get(URL, params={"lat": 32.34, "lon": -6.36, "water": "irrigue"}).json()
    assert body["query"]["water"] == "irrigue"
    assert {a["id"]: a["variant"] for a in body["advice"]} == {
        "drought_tolerant": "irrigue", "dry_autumn": "irrigue", "hot_spring": "pluvial",
        "last_season_dry": "irrigue", "field_shift": "pluvial",
    }


def test_tanger_is_proche(client):
    body = client.get(URL, params={"lat": 35.77, "lon": -5.80}).json()
    assert body["status"] == "proche"
    assert body["cell"] == {
        "id": "C113", "lat": 35.5, "lon": -5.625, "distanceDeg": 0.322,
        "region": "Nord", "heatRelevant": True,
    }
    assert body["lastSeason"]["type"] == "normal_hot"
    assert body["lastSeason"]["rainPctNormal"] == 110
    assert body["advice"] == []


@pytest.mark.parametrize(
    "lat, lon, nearest_id, dist", [(33.0, -9.5, "C066", 0.75), (30.0, -5.0, "C037", 1.5)],
    ids=["ocean", "sahara"],
)
def test_outside_coverage_is_200_hors_zone(client, lat, lon, nearest_id, dist):
    r = client.get(URL, params={"lat": lat, "lon": lon})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "hors_zone"
    assert body["nearestCell"]["id"] == nearest_id and body["nearestCell"]["distanceDeg"] == dist
    assert body["maxDistanceDeg"] == 0.5
    for key in ("cell", "reference", "normals", "lastSeason", "counts"):
        assert body[key] is None
    assert body["history"] == [] and body["advice"] == []


@pytest.mark.parametrize(
    "params",
    [
        {"lat": 91, "lon": 0}, {"lat": 0, "lon": -181}, {"lon": 0}, {"lat": "abc", "lon": 0},
        {"lat": 32.34, "lon": -6.36, "water": "goutte"},
    ],
    ids=["lat-91", "lon--181", "lat-missing", "lat-abc", "water-invalid"],
)
def test_invalid_input_is_400(client, params):
    """The app's global handler turns validation errors into 400 + a French message (spec §5
    of the diagnostic), so this route answers 400, not the 422 the seasons spec assumed."""
    r = client.get(URL, params=params)
    assert r.status_code == 400
    assert r.json()["detail"]


def test_cors_header_for_the_nginx_origin(client):
    r = client.get(URL, params={"lat": 32.34, "lon": -6.36},
                   headers={"Origin": "http://localhost:8080"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:8080"


# --- store in error: the app still starts, /health 200, seasons 503 -----------------------

@pytest.fixture
def client_with_store(monkeypatch: pytest.MonkeyPatch):
    """A client whose lifespan loads the store returned by `factory` (real startup path)."""
    def make(factory):
        monkeypatch.setattr(store_module, "get_default_store", factory)
        return TestClient(app)
    return make


def test_store_in_error_gives_503_and_health_reports_it(client_with_store):
    with client_with_store(lambda: SeasonStore.failed("fichiers manquants : x")) as c:
        r = c.get(URL, params={"lat": 32.34, "lon": -6.36})
        assert r.status_code == 503
        assert r.json() == {"detail": {"code": "model_unavailable",
                                       "message": "fichiers manquants : x"}}
        h = c.get("/health")
        assert h.status_code == 200 and h.json() == {"status": "ok", "seasonsModel": "error"}


def test_modified_model_file_gives_503_without_unpickling(client_with_store, tmp_path: Path):
    for name in RUNTIME_FILES:
        shutil.copyfile(MODEL_DIR / name, tmp_path / name)
    data = bytearray((tmp_path / "season_model.joblib").read_bytes())
    data[-1] ^= 0x01
    (tmp_path / "season_model.joblib").write_bytes(bytes(data))

    with mock.patch.object(store_module.joblib, "load") as joblib_load:
        with client_with_store(lambda: load_store(tmp_path)) as c:
            r = c.get(URL, params={"lat": 32.34, "lon": -6.36})
            assert c.get("/health").json()["seasonsModel"] == "error"
    assert r.status_code == 503 and r.json()["detail"]["code"] == "model_unavailable"
    assert "SHA-256" in r.json()["detail"]["message"]
    joblib_load.assert_not_called()


def test_diagnostic_and_weather_routes_still_registered():
    routes = {(m, r.path) for r in app.routes for m in getattr(r, "methods", ())}
    assert ("POST", "/api/parcel/diagnostic") in routes
    assert ("GET", "/api/weather/forecast") in routes
    assert ("GET", "/api/seasons/zone") in routes
