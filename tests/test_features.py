import numpy as np
import pandas as pd

from src.features import compute_features, longest_dry_spell


def synthetic(start="2019-10-01", end="2021-05-31", rain=2.0, tmax=30.0):
    idx = pd.date_range(start, end, freq="D")
    n = len(idx)
    return pd.DataFrame({
        "T2M": np.full(n, 15.0), "T2M_MAX": np.full(n, tmax), "T2M_MIN": np.full(n, 5.0),
        "PRECTOTCORR": np.full(n, rain), "GWETTOP": np.full(n, 0.5), "GWETROOT": np.full(n, 0.6),
    }, index=idx)


def test_longest_dry_spell_nan_breaks_run():
    s = pd.Series([0, 0, 0, 5, 0, 0, np.nan, 0, 0, 0, 0])
    assert longest_dry_spell(s) == 4


def test_season_rain_and_labels():
    f = compute_features(synthetic())
    # Seasons 2020 (Oct19–May20, 244 days incl. 29 Feb) and 2021 (Oct20–May21, 243 days)
    assert list(f.seasons.index) == [2020, 2021]
    assert f.seasons.loc[2020, "rain_mm"] == 244 * 2.0
    assert f.seasons.loc[2021, "rain_mm"] == 243 * 2.0
    assert f.summary["dry_spell_season"] == 0


def test_heat_days_counted():
    df = synthetic(tmax=30.0)
    df.loc["2020-04-01":"2020-04-10", "T2M_MAX"] = 36.0
    f = compute_features(df)
    assert f.seasons.loc[2020, "heat_days"] == 10
    assert f.seasons.loc[2021, "heat_days"] == 0


def test_season_with_too_much_missing_is_dropped():
    df = synthetic()
    df.loc["2020-10-01":"2020-12-31", "PRECTOTCORR"] = np.nan  # ~38% of season 2021
    f = compute_features(df)
    assert list(f.seasons.index) == [2020]
    assert f.summary["missing_share"] > 0


def test_partial_season_dropped():
    f = compute_features(synthetic(start="2020-01-01", end="2021-05-31"))
    assert list(f.seasons.index) == [2021]  # season 2020 lacks Oct–Dec 2019
