"""Clean daily POWER data -> per-location features.

Conventions
- Growing season = 1 Oct (year Y-1) .. 31 May (year Y), labelled Y.
- A season / calendar year is "complete" if it covers all its months AND at least
  MIN_COVERAGE of its days have non-missing rainfall. Incomplete ones are dropped
  from aggregates (but counted in the missing-data share).
- Dry day = PRECTOTCORR < DRY_DAY_MM. A missing rainfall day breaks a dry spell
  (we do not assume it was dry).
- Heat day = T2M_MAX > HEAT_DAY_C.
- Variability = coefficient of variation (std / mean) of seasonal rainfall across seasons.
All values come from NASA POWER only (no external data).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

HEAT_DAY_C = 35.0
DRY_DAY_MM = 1.0
MIN_COVERAGE = 0.9
SEASON_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5]


@dataclass
class Features:
    summary: dict              # scalar features used by scoring/explanation
    seasons: pd.DataFrame      # one row per complete growing season
    years: pd.DataFrame        # one row per complete calendar year
    monthly: pd.DataFrame      # monthly climatology (12 rows) for charts


def season_label(idx: pd.DatetimeIndex) -> np.ndarray:
    """Season year label for each date; NaN-like (-1) outside Oct–May."""
    lab = np.where(idx.month >= 10, idx.year + 1, idx.year)
    return np.where(np.isin(idx.month, SEASON_MONTHS), lab, -1)


def longest_dry_spell(rain: pd.Series, threshold: float = DRY_DAY_MM) -> int:
    """Longest run of consecutive days with rain < threshold. NaN breaks the run."""
    best = cur = 0
    for v in rain.to_numpy():
        if not np.isnan(v) and v < threshold:
            cur += 1
            best = max(best, cur)
        else:
            cur = 0
    return best


def _complete(group: pd.DataFrame, expected_months: int) -> bool:
    if group.index.to_period("M").nunique() < expected_months:
        return False
    return group["PRECTOTCORR"].notna().mean() >= MIN_COVERAGE


def _cv(s: pd.Series) -> float:
    s = s.dropna()
    return float(s.std(ddof=1) / s.mean()) if len(s) >= 2 and s.mean() > 0 else float("nan")


def compute_features(df: pd.DataFrame) -> Features:
    df = df.sort_index()

    # --- growing seasons (Oct–May) ---
    df_s = df.assign(season=season_label(df.index))
    df_s = df_s[df_s["season"] > 0]
    rows = []
    for season, g in df_s.groupby("season"):
        if not _complete(g, expected_months=8):
            continue
        rows.append({
            "season": int(season),
            "rain_mm": g["PRECTOTCORR"].sum(min_count=1),
            "t_mean": g["T2M"].mean(),
            "t_max_mean": g["T2M_MAX"].mean(),
            "heat_days": int((g["T2M_MAX"] > HEAT_DAY_C).sum()),
            "max_dry_spell": longest_dry_spell(g["PRECTOTCORR"]),
            "gwettop": g["GWETTOP"].mean(),
            "gwetroot": g["GWETROOT"].mean(),
        })
    seasons = pd.DataFrame(rows).set_index("season") if rows else pd.DataFrame()

    # --- calendar years ---
    yrows = []
    for year, g in df.groupby(df.index.year):
        if not _complete(g, expected_months=12):
            continue
        yrows.append({
            "year": int(year),
            "rain_mm": g["PRECTOTCORR"].sum(min_count=1),
            "t_mean": g["T2M"].mean(),
            "t_max_abs": g["T2M_MAX"].max(),
            "heat_days": int((g["T2M_MAX"] > HEAT_DAY_C).sum()),
            "max_dry_spell": longest_dry_spell(g["PRECTOTCORR"]),
        })
    years = pd.DataFrame(yrows).set_index("year") if yrows else pd.DataFrame()

    # --- monthly climatology (for charts) ---
    m = df.groupby([df.index.year, df.index.month])
    monthly_tot = pd.DataFrame({
        "rain_mm": m["PRECTOTCORR"].sum(min_count=1),
        "t_mean": m["T2M"].mean(),
        "t_max": m["T2M_MAX"].mean(),
        "gwettop": m["GWETTOP"].mean(),
        "gwetroot": m["GWETROOT"].mean(),
    })
    monthly = monthly_tot.groupby(level=1).mean()
    monthly.index.name = "month"

    def _mean(frame, col):
        return float(frame[col].mean()) if not frame.empty else float("nan")

    summary = {
        "n_seasons": int(len(seasons)),
        "n_years": int(len(years)),
        "first_date": df.index.min().strftime("%Y-%m-%d"),
        "last_date": df.index.max().strftime("%Y-%m-%d"),
        "missing_share": float(df.isna().to_numpy().mean()),
        "annual_rain_mm": _mean(years, "rain_mm"),
        "annual_rain_cv": _cv(years["rain_mm"]) if not years.empty else float("nan"),
        "season_rain_mm": _mean(seasons, "rain_mm"),
        "season_rain_min_mm": float(seasons["rain_mm"].min()) if not seasons.empty else float("nan"),
        "season_rain_cv": _cv(seasons["rain_mm"]) if not seasons.empty else float("nan"),
        "t_mean": float(df["T2M"].mean()),
        "t_max_mean": float(df["T2M_MAX"].mean()),
        "t_max_abs": float(df["T2M_MAX"].max()),
        "heat_days_year": _mean(years, "heat_days"),
        "heat_days_season": _mean(seasons, "heat_days"),
        "dry_spell_season": _mean(seasons, "max_dry_spell"),
        "gwettop_season": _mean(seasons, "gwettop"),
        "gwetroot_season": _mean(seasons, "gwetroot"),
    }
    return Features(summary=summary, seasons=seasons, years=years, monthly=monthly)


if __name__ == "__main__":
    from src.power_client import get_power_data
    f = compute_features(get_power_data().df)
    for k, v in f.summary.items():
        print(f"{k:22s} {v:.3f}" if isinstance(v, float) else f"{k:22s} {v}")
    print(f.seasons.round(2))
