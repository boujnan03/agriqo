import pandas as pd

from src import explain, scoring
from tests.test_scoring import CROPS as _CROPS, ROTS, SUMMARY

CROPS = {k: {**v, "name_fr": k} for k, v in _CROPS.items()}

FULL = {**SUMMARY, "n_seasons": 2, "first_date": "2020-01-01", "last_date": "2021-12-31",
        "season_rain_min_mm": 250.0, "gwetroot_season": 0.5}


def test_explanation_uses_computed_numbers():
    sc = scoring.score_all(FULL, 2, 1, 1, crops=CROPS, rotations=ROTS)
    seasons = pd.DataFrame({"rain_mm": [250.0, 350.0]}, index=[2020, 2021])
    txt = explain.explain(FULL, sc, CROPS, seasons=seasons)
    assert "84.1/100" in txt                 # total from scoring (84.0625)
    assert "300 mm" in txt and "250 mm" in txt and "350 mm" in txt
    assert "récoltes 2020–2021" in txt
    assert "WL" in txt and "Trop proche" not in txt


def test_explanation_survives_missing_water():
    s = {**FULL, "season_rain_mm": float("nan")}
    sc = scoring.score_all(s, 1, 1, 1, crops=CROPS, rotations=ROTS)
    txt = explain.explain(s, sc, CROPS)
    assert "Résultat" in txt


def test_every_language_has_same_keys():
    ref = explain.TEXTS["fr"]
    for lang, d in explain.TEXTS.items():
        for section in ref:
            assert set(d[section]) == set(ref[section]), (lang, section)


def test_limitations_mentions_required_points():
    from types import SimpleNamespace
    pdata = SimpleNamespace(lat=32.34, lon=-6.35, source="fallback")
    txt = explain.limitations({**FULL, "missing_share": 0.0123}, pdata)
    assert "0,5°" in txt and "2020-01-01" in txt and "1.2%" in txt
    assert "agronome" in txt and "ne remplace pas" in txt and "secours" in txt
