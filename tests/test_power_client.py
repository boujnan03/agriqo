import json

import numpy as np

from src import power_client as pc


def _raw(values_t2m, values_rain, fill=-999.0):
    dates = [f"202501{d:02d}" for d in range(1, len(values_t2m) + 1)]
    return {
        "geometry": {"coordinates": [-6.35, 32.34, 994.6]},
        "header": {"fill_value": fill, "start": dates[0], "end": dates[-1]},
        "properties": {"parameter": {
            "T2M": dict(zip(dates, values_t2m)),
            "PRECTOTCORR": dict(zip(dates, values_rain)),
            "GWETTOP": dict(zip(dates, [0.4, 1.5, -999.0, 0.3][: len(dates)])),
        }},
        "parameters": {"T2M": {"units": "C"}},
    }


def test_fill_values_become_nan():
    df = pc.parse_response(_raw([10.0, -999.0, 12.0, 13.0], [0.0, 2.0, -999.0, 1.0]))
    assert df.shape == (4, 3)
    assert np.isnan(df.loc["2025-01-02", "T2M"])
    assert np.isnan(df.loc["2025-01-03", "PRECTOTCORR"])
    assert df["T2M"].isna().sum() == 1


def test_out_of_range_soil_wetness_is_missing():
    df = pc.parse_response(_raw([1.0] * 4, [0.0] * 4))
    # 1.5 (impossible) and -999 (fill) -> NaN, valid 0.4 / 0.3 kept
    assert df["GWETTOP"].isna().sum() == 2
    assert df["GWETTOP"].iloc[0] == 0.4


def test_fallback_used_when_api_fails(monkeypatch, tmp_path):
    fb = tmp_path / "fb.json"
    fb.write_text(json.dumps(_raw([1.0] * 4, [0.0] * 4)))
    monkeypatch.setattr(pc, "FALLBACK_FILE", fb)
    monkeypatch.setattr(pc, "CACHE_DIR", tmp_path / "cache")

    def boom(*a, **k):
        raise ConnectionError("offline")

    monkeypatch.setattr(pc, "fetch_raw", boom)
    data = pc.get_power_data(31.0, -7.0, "20250101", "20250104")
    assert data.source == "fallback"
    assert "indisponible" in data.note


def test_cache_hit(monkeypatch, tmp_path):
    monkeypatch.setattr(pc, "CACHE_DIR", tmp_path)
    path = pc._cache_path(31.0, -7.0, "20250101", "20250104")
    path.write_text(json.dumps(_raw([1.0] * 4, [0.0] * 4)))
    monkeypatch.setattr(pc, "fetch_raw", lambda *a, **k: (_ for _ in ()).throw(AssertionError("no net")))
    assert pc.get_power_data(31.0, -7.0, "20250101", "20250104").source == "cache"
