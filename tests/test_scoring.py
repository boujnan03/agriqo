"""Hand-computed example (see docs/scoring.md §5 for the same numbers)."""
import math

import pytest

from src import scoring as sc

CROPS = {
    "W": {"family": "cereal", "water_need_mm": 400, "heat_tolerance": 1, "drought_tolerance": 3,
          "nitrogen_effect": -1, "soil_health_effect": 0, "season": "oct-may"},
    "L": {"family": "legume", "water_need_mm": 300, "heat_tolerance": 5, "drought_tolerance": 5,
          "nitrogen_effect": 1, "soil_health_effect": 1, "season": "oct-may"},
}
SUMMARY = {"season_rain_mm": 300.0, "annual_rain_mm": 400.0, "heat_days_season": 10.0,
           "heat_days_year": 40.0, "dry_spell_season": 37.5, "season_rain_cv": 0.25}
ROTS = [{"id": "WL", "crops": ["W", "L"]}, {"id": "WW", "crops": ["W", "W"]}]


def test_normalize_weights():
    assert sc.normalize_weights(2, 1, 1) == {"water": 0.5, "soil": 0.25, "climate": 0.25}
    assert sum(sc.normalize_weights(0.3, 7, 1).values()) == pytest.approx(1)
    assert sc.normalize_weights(0, 0, 0) == pytest.approx({"water": 1/3, "soil": 1/3, "climate": 1/3})
    assert sc.normalize_weights(-5, 1, 1)["water"] == 0


def test_hand_computed_example():
    out = sc.score_all(SUMMARY, 2, 1, 1, crops=CROPS, rotations=ROTS)
    wl, ww = out["results"]
    # Water: W deficit 100/400 -> 75 ; L no deficit -> 100 ; mean 87.5
    assert wl.water.value == pytest.approx(87.5)
    # Soil: 50 + 15 (1 legume) + 10 (2 families) - 0 repeats + 5 (effect) = 80
    assert wl.soil.value == pytest.approx(80)
    # Climate: stress heat=0.5, drought=0.5*0.5+0.5*0.5=0.5
    #   W: 100 - 50*0.5*4/4 - 50*0.5*2/4 = 62.5 ; L: 100 ; mean 81.25
    assert wl.climate.value == pytest.approx(81.25)
    assert wl.total == pytest.approx(0.5 * 87.5 + 0.25 * 80 + 0.25 * 81.25)  # 84.0625
    # WW: water 75, soil 50 - 2*10 (W->W, wrap W->W) = 30, climate 62.5
    assert (ww.water.value, ww.soil.value, ww.climate.value) == pytest.approx((75, 30, 62.5))
    assert ww.total == pytest.approx(60.625)
    assert out["ordered"][0].id == "WL"
    assert out["top_too_close"] is False


def test_missing_rain_excludes_water_and_renormalises():
    s = {**SUMMARY, "season_rain_mm": float("nan")}
    wl = sc.score_all(s, 2, 1, 1, crops=CROPS, rotations=ROTS)["results"][0]
    assert wl.water.value is None
    assert wl.weights_used == pytest.approx({"water": 0, "soil": 0.5, "climate": 0.5})
    assert wl.total == pytest.approx(0.5 * 80 + 0.5 * 81.25)


def test_all_climate_missing_gives_none():
    s = {k: math.nan for k in SUMMARY}
    out = sc.score_all(s, 0, 0, 1, crops=CROPS, rotations=ROTS)
    assert all(r.total is None for r in out["results"])


def test_too_close_flag():
    rots = [{"id": "X", "crops": ["W", "L"]}, {"id": "Y", "crops": ["L", "W"]}]
    out = sc.score_all(SUMMARY, 1, 1, 1, crops=CROPS, rotations=rots)
    assert out["top_too_close"] is True


def test_unknown_crop_raises():
    with pytest.raises(KeyError):
        sc.score_all(SUMMARY, 1, 1, 1, crops=CROPS, rotations=[{"id": "Z", "crops": ["?"]}])


def test_real_data_files_score():
    out = sc.score_all(SUMMARY, 1, 1, 1)
    assert len(out["results"]) == 3
    for r in out["results"]:
        for sub in (r.water, r.soil, r.climate):
            assert 0 <= sub.value <= 100
