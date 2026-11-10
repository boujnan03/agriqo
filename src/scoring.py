"""Rule-based, explainable rotation scoring. See docs/scoring.md (keep in sync!).

Total = w_water * WaterScore + w_soil * SoilHealthScore + w_climate * ClimateScore
Each sub-score is 0-100 (higher = better). Weights are normalised to sum to 1.

Inputs: `summary` dict from features.compute_features (NASA POWER) and the crop table
(data/crops.json, approximate values, needs validation).
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOO_CLOSE_POINTS = 3.0

# ---- Soil rule constants (docs/scoring.md §2) ----
SOIL_BASE = 50.0
SOIL_LEGUME_BONUS = 15.0        # per crop slot with nitrogen_effect = +1
SOIL_DIVERSITY_BONUS = 10.0     # per distinct crop family beyond the first
SOIL_REPEAT_PENALTY = 10.0      # per consecutive same-family pair (rotation wraps around)
SOIL_EFFECT_POINTS = 5.0        # x crop soil_health_effect (-1/0/+1), per slot

# ---- Climate rule constants (docs/scoring.md §3) ----
HEAT_DAYS_FULL_STRESS = 20.0    # seasonal heat days at which heat stress = 1
DRY_SPELL_NO_STRESS = 15.0      # days; dry spells shorter than this = no stress
DRY_SPELL_FULL_STRESS = 60.0    # days; at or above = full stress
CV_FULL_STRESS = 0.5            # rainfall CV at which variability stress = 1
MAX_FACTOR_PENALTY = 50.0       # max points lost per factor (heat, drought) for tolerance 1


@dataclass
class SubScore:
    value: float | None                 # 0-100, None if inputs missing
    per_crop: list[dict] = field(default_factory=list)
    details: dict = field(default_factory=dict)


@dataclass
class RotationResult:
    id: str
    name: str
    crops: list[str]
    water: SubScore
    soil: SubScore
    climate: SubScore
    total: float | None
    weights_used: dict


def load_crops(path: Path | None = None) -> dict:
    return json.loads((path or ROOT / "data" / "crops.json").read_text(encoding="utf-8"))["crops"]


def load_rotations(path: Path | None = None) -> list[dict]:
    return json.loads((path or ROOT / "data" / "rotations.json").read_text(encoding="utf-8"))["rotations"]


def normalize_weights(w_water: float, w_soil: float, w_climate: float) -> dict:
    """Scale weights to sum to 1. Negative -> 0. All zero -> equal weights."""
    w = {"water": max(0.0, w_water), "soil": max(0.0, w_soil), "climate": max(0.0, w_climate)}
    s = sum(w.values())
    if s == 0:
        return {k: 1 / 3 for k in w}
    return {k: v / s for k, v in w.items()}


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def _ok(*vals) -> bool:
    return all(v is not None and not (isinstance(v, float) and math.isnan(v)) for v in vals)


# §1 WATER ------------------------------------------------------------------
def water_score(crop_ids: list[str], crops: dict, s: dict) -> SubScore:
    """Per crop: available rain = mean Oct-May rain (or annual rain for 'year' crops).
    deficit_share = max(0, need - rain) / need  (share of need that irrigation must supply)
    crop score = 100 * (1 - deficit_share). Rotation = mean over slots."""
    per = []
    for cid in crop_ids:
        c = crops[cid]
        rain = s.get("annual_rain_mm") if c["season"] == "year" else s.get("season_rain_mm")
        if not _ok(rain):
            return SubScore(None, details={"missing": "rainfall"})
        need = c["water_need_mm"]
        deficit = max(0.0, need - rain)
        per.append({"crop": cid, "need_mm": need, "rain_mm": rain, "deficit_mm": deficit,
                    "score": _clamp(100 * (1 - deficit / need))})
    total_deficit = sum(p["deficit_mm"] for p in per)
    return SubScore(sum(p["score"] for p in per) / len(per), per,
                    {"irrigation_need_mm_per_cycle": total_deficit,
                     "irrigation_need_mm_per_season": total_deficit / len(per)})


# §2 SOIL HEALTH -------------------------------------------------------------
def soil_score(crop_ids: list[str], crops: dict) -> SubScore:
    """50 + 15*legume slots + 10*(distinct families - 1) - 10*same-family consecutive pairs
    (with wrap-around) + 5*sum(soil_health_effect). Clamped 0-100. Uses crop table only."""
    fams = [crops[c]["family"] for c in crop_ids]
    n = len(crop_ids)
    legumes = sum(1 for c in crop_ids if crops[c]["nitrogen_effect"] > 0)
    distinct = len(set(fams))
    repeats = sum(1 for i in range(n) if n > 1 and fams[i] == fams[(i + 1) % n])
    effect = sum(crops[c]["soil_health_effect"] for c in crop_ids)
    parts = {
        "base": SOIL_BASE,
        "legume_bonus": SOIL_LEGUME_BONUS * legumes,
        "diversity_bonus": SOIL_DIVERSITY_BONUS * (distinct - 1),
        "repeat_penalty": -SOIL_REPEAT_PENALTY * repeats,
        "crop_effect": SOIL_EFFECT_POINTS * effect,
    }
    details = {**parts, "n_legumes": legumes, "n_families": distinct, "n_repeats": repeats}
    return SubScore(_clamp(sum(parts.values())), details=details)


# §3 CLIMATE -----------------------------------------------------------------
def climate_stress(s: dict) -> dict | None:
    """Location stress indices in [0, 1] from NASA POWER features."""
    if not _ok(s.get("heat_days_season"), s.get("dry_spell_season"), s.get("season_rain_cv")):
        return None
    heat = min(1.0, s["heat_days_season"] / HEAT_DAYS_FULL_STRESS)
    heat_year = min(1.0, (s.get("heat_days_year") or 0) / (HEAT_DAYS_FULL_STRESS * 4))
    dry = min(1.0, max(0.0, (s["dry_spell_season"] - DRY_SPELL_NO_STRESS)
                       / (DRY_SPELL_FULL_STRESS - DRY_SPELL_NO_STRESS)))
    var = min(1.0, s["season_rain_cv"] / CV_FULL_STRESS)
    return {"heat": heat, "heat_year": heat_year, "dry_spell": dry, "variability": var,
            "drought": 0.5 * dry + 0.5 * var}


def climate_score(crop_ids: list[str], crops: dict, s: dict) -> SubScore:
    """Per crop: 100 - 50*heat_stress*(5-heat_tol)/4 - 50*drought_stress*(5-drought_tol)/4.
    Perennial ('year') crops use annual heat days (heat_year stress). Rotation = mean."""
    st = climate_stress(s)
    if st is None:
        return SubScore(None, details={"missing": "climate features"})
    per = []
    for cid in crop_ids:
        c = crops[cid]
        heat = st["heat_year"] if c["season"] == "year" else st["heat"]
        hp = MAX_FACTOR_PENALTY * heat * (5 - c["heat_tolerance"]) / 4
        dp = MAX_FACTOR_PENALTY * st["drought"] * (5 - c["drought_tolerance"]) / 4
        per.append({"crop": cid, "heat_penalty": hp, "drought_penalty": dp,
                    "score": _clamp(100 - hp - dp)})
    return SubScore(sum(p["score"] for p in per) / len(per), per, {"stress": st})


# TOTAL ----------------------------------------------------------------------
def score_rotation(rot: dict, crops: dict, s: dict, weights: dict) -> RotationResult:
    ids = rot["crops"]
    unknown = [c for c in ids if c not in crops]
    if unknown:
        raise KeyError(f"Rotation {rot['id']}: unknown crop ids {unknown}")
    subs = {"water": water_score(ids, crops, s), "soil": soil_score(ids, crops),
            "climate": climate_score(ids, crops, s)}
    # Missing sub-score -> excluded, remaining weights re-normalised (flagged via weights_used).
    avail = {k: weights[k] for k, v in subs.items() if v.value is not None}
    wsum = sum(avail.values())
    if wsum > 0:
        used = {k: avail.get(k, 0.0) / wsum for k in subs}
        total = sum(used[k] * subs[k].value for k in avail)
    else:
        used, total = {k: 0.0 for k in subs}, None
    return RotationResult(rot["id"], rot.get("name_fr", rot["id"]), ids,
                          subs["water"], subs["soil"], subs["climate"], total, used)


def rank(results: list[RotationResult]) -> dict:
    """Sort by total desc; flag 'too close to call' if best - second < TOO_CLOSE_POINTS."""
    ordered = sorted([r for r in results if r.total is not None], key=lambda r: -r.total)
    close = []
    for i, a in enumerate(ordered):
        for b in ordered[i + 1:]:
            if abs(a.total - b.total) < TOO_CLOSE_POINTS:
                close.append((a.id, b.id, abs(a.total - b.total)))
    top_close = len(ordered) >= 2 and ordered[0].total - ordered[1].total < TOO_CLOSE_POINTS
    return {"ordered": ordered, "close_pairs": close, "top_too_close": top_close}


def score_all(summary: dict, w_water: float, w_soil: float, w_climate: float,
              crops: dict | None = None, rotations: list[dict] | None = None) -> dict:
    crops = crops or load_crops()
    rotations = rotations or load_rotations()
    w = normalize_weights(w_water, w_soil, w_climate)
    res = [score_rotation(r, crops, summary, w) for r in rotations]
    return {"weights": w, "results": res, **rank(res)}


if __name__ == "__main__":
    from src.features import compute_features
    from src.power_client import get_power_data
    out = score_all(compute_features(get_power_data().df).summary, 1, 1, 1)
    for r in out["ordered"]:
        print(f"{r.id}: total={r.total:.1f} water={r.water.value:.1f} "
              f"soil={r.soil.value:.1f} climate={r.climate.value:.1f}  {'+'.join(r.crops)}")
    print("top too close:", out["top_too_close"], out["close_pairs"])
