"""Rule-based advice from a cell's past seasons (spec §8; documented in docs/seasons_rules.md).

Windows: W = the last RECENT_WINDOW seasons of the cell, B = all earlier seasons. "Normal" =
the cell's baseline mean (1996-2025), NOT rounded. "Below" / "above" are strict.
pct = round(100 * mean_W / normal). Every number a text may show is in `evidence`: nothing is
invented. Every rule is needs_validation (thresholds pending an agronomist).

Any change to a rule or threshold -> update this file, docs/seasons_rules.md and the tests.
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from fractions import Fraction
from typing import Literal

from app.seasons import constants as C
from app.seasons.store import Cell, Season

Water = Literal["pluvial", "irrigue"]

# Rules whose text is softened for an irrigated farm; the others keep the "pluvial" variant.
_ATTENUATED_WHEN_IRRIGATED = {"drought_tolerant", "dry_autumn", "dry_spring", "last_season_dry"}


@dataclass(frozen=True)
class Advice:
    id: str
    variant: Water
    crops: list[str]
    evidence: dict[str, int | float]
    needs_validation: bool = field(default=True)


def _r1(x: float) -> float:
    return round(x, 1)


def _pct(value: float, normal: float) -> int:
    return round(100 * value / normal)


def _mean(values: Sequence[float]) -> float:
    return sum(values) / len(values)


def build_advice(cell: Cell, seasons: Sequence[Season], water: Water = "pluvial") -> list[Advice]:
    """Advice for one cell, in the spec's table order. `seasons` sorted by season."""
    recent = list(seasons[-C.RECENT_WINDOW:])
    before = list(seasons[: -C.RECENT_WINDOW])
    total = len(recent)
    normal = cell.mean
    found: list[tuple[str, list[str], dict[str, int | float]]] = []

    dry_recent = sum(s.type == "dry_hot" for s in recent)
    dry_before = sum(s.type == "dry_hot" for s in before)

    # drought_tolerant: many dry_hot seasons recently.
    if dry_recent >= C.DRY_SEASONS_MIN:
        found.append(("drought_tolerant", ["orge", "legumineuses"], {
            "count": dry_recent, "total": total,
            "from": recent[0].season, "to": recent[-1].season,
        }))

    # dry_autumn: Oct-Dec rain often below normal, and well below on average.
    autumn = [s.rain_autumn for s in recent]
    below = sum(v < normal["rain_autumn"] for v in autumn)
    pct = _pct(_mean(autumn), normal["rain_autumn"])
    if below >= C.AUTUMN_BELOW_MIN and pct < C.AUTUMN_PCT_MAX:
        found.append(("dry_autumn", [], {
            "below": below, "total": total, "meanMm": _r1(_mean(autumn)),
            "normalMm": _r1(normal["rain_autumn"]), "pct": pct,
        }))

    # hot_spring: never evaluated where spring heat is not meaningful (heat_relevant False).
    if cell.heat_relevant:
        heat = [s.heat_spring for s in recent]
        above = sum(v > normal["heat_spring"] for v in heat)
        anom = _mean([s.heat_spring_anom for s in recent])
        if above >= C.HOT_SPRING_ABOVE_MIN and anom >= C.HOT_SPRING_ANOM_MIN:
            found.append(("hot_spring", ["ble", "orge"], {
                "above": above, "total": total, "meanDays": _r1(_mean(heat)),
                "normalDays": _r1(normal["heat_spring"]),
            }))

    # dry_spring: Mar-May rain often below normal, and below on average.
    spring = [s.rain_spring for s in recent]
    below = sum(v < normal["rain_spring"] for v in spring)
    pct = _pct(_mean(spring), normal["rain_spring"])
    if below >= C.SPRING_BELOW_MIN and pct < C.SPRING_PCT_MAX:
        found.append(("dry_spring", ["orge"], {"below": below, "total": total, "pct": pct}))

    # last_season_dry: the last available season is dry_hot.
    last = recent[-1]
    if last.type == "dry_hot":
        found.append(("last_season_dry", [], {
            "season": last.season, "rainMm": _r1(last.rain_mm),
            "normalMm": _r1(normal["rain_mm"]), "pct": _pct(last.rain_mm, normal["rain_mm"]),
        }))

    # wet_frequent: several very wet seasons recently.
    wet = sum(s.type == "very_wet_cool" for s in recent)
    if wet >= C.WET_SEASONS_MIN:
        found.append(("wet_frequent", ["ble"], {"count": wet, "total": total}))

    # field_shift: dry seasons much more frequent than before. Shares compared exactly
    # (fractions), so a gap of exactly 0.30 is not lost to float rounding.
    if before and dry_recent >= C.SHIFT_DRY_MIN:
        gap = Fraction(dry_recent, total) - Fraction(dry_before, len(before))
        if gap >= Fraction(str(C.SHIFT_SHARE_GAP)):
            found.append(("field_shift", [], {
                "recent": dry_recent, "recentTotal": total, "since": recent[0].season,
                "before": dry_before, "beforeTotal": len(before),
                "beforeFrom": before[0].season, "beforeTo": before[-1].season,
            }))

    return [
        Advice(
            id=rule_id,
            variant=water if rule_id in _ATTENUATED_WHEN_IRRIGATED else "pluvial",
            crops=crops, evidence=evidence,
        )
        for rule_id, crops, evidence in found
    ]
