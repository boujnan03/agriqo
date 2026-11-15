"""Advice rules (spec §8): the expected-results table, irrigated variants, per-rule counts."""
from __future__ import annotations

from collections import Counter

import pytest

from app.seasons.advice import build_advice

# Spec §8 "Résultats attendus" (water=pluvial), every evidence value, in output order.
EXPECTED = {
    "C057": [
        ("drought_tolerant", {"count": 9, "total": 10, "from": 2016, "to": 2025}),
        ("dry_autumn", {"below": 8, "total": 10, "meanMm": 111.3, "normalMm": 189.9, "pct": 59}),
        ("hot_spring", {"above": 8, "total": 10, "meanDays": 16.8, "normalDays": 12.6}),
        ("last_season_dry", {"season": 2025, "rainMm": 370.6, "normalMm": 458.6, "pct": 81}),
        ("field_shift", {"recent": 9, "recentTotal": 10, "since": 2016, "before": 3,
                         "beforeTotal": 20, "beforeFrom": 1996, "beforeTo": 2015}),
    ],
    "C045": [
        ("drought_tolerant", {"count": 6, "total": 10, "from": 2016, "to": 2025}),
        ("dry_autumn", {"below": 10, "total": 10, "meanMm": 90.8, "normalMm": 158.9, "pct": 57}),
        ("field_shift", {"recent": 6, "recentTotal": 10, "since": 2016, "before": 3,
                         "beforeTotal": 20, "beforeFrom": 1996, "beforeTo": 2015}),
    ],
    "C079": [
        ("drought_tolerant", {"count": 5, "total": 10, "from": 2016, "to": 2025}),
        ("dry_autumn", {"below": 8, "total": 10, "meanMm": 138.0, "normalMm": 191.4, "pct": 72}),
        ("last_season_dry", {"season": 2025, "rainMm": 279.9, "normalMm": 416.4, "pct": 67}),
        ("field_shift", {"recent": 5, "recentTotal": 10, "since": 2016, "before": 3,
                         "beforeTotal": 20, "beforeFrom": 1996, "beforeTo": 2015}),
    ],
    "C091": [  # no field_shift: 5/10 vs 5/20, the gap is 0.25 < 0.30
        ("drought_tolerant", {"count": 5, "total": 10, "from": 2016, "to": 2025}),
        ("dry_autumn", {"below": 8, "total": 10, "meanMm": 168.0, "normalMm": 230.2, "pct": 73}),
        ("hot_spring", {"above": 7, "total": 10, "meanDays": 19.0, "normalDays": 16.1}),
        ("last_season_dry", {"season": 2025, "rainMm": 423.2, "normalMm": 537.5, "pct": 79}),
    ],
    "C113": [],  # Tanger (proche): no advice at all
    "C046": [  # heatRelevant false: hot_spring never evaluated
        ("dry_autumn", {"below": 7, "total": 10, "meanMm": 88.1, "normalMm": 112.3, "pct": 78}),
    ],
}

CROPS = {
    "drought_tolerant": ["orge", "legumineuses"], "dry_autumn": [], "hot_spring": ["ble", "orge"],
    "dry_spring": ["orge"], "last_season_dry": [], "wet_frequent": ["ble"], "field_shift": [],
}
ATTENUATED = {"drought_tolerant", "dry_autumn", "dry_spring", "last_season_dry"}


def _advice(store, cell_id, water="pluvial"):
    return build_advice(store.cells[cell_id], store.seasons[cell_id], water)


@pytest.mark.parametrize("cell_id", list(EXPECTED))
def test_expected_results_table(season_store, cell_id):
    advice = _advice(season_store, cell_id)
    assert [(a.id, a.evidence) for a in advice] == EXPECTED[cell_id]
    for a in advice:
        assert a.variant == "pluvial"
        assert a.needs_validation is True
        assert a.crops == CROPS[a.id]


@pytest.mark.parametrize("cell_id", list(EXPECTED))
def test_irrigated_variants(season_store, cell_id):
    pluvial = _advice(season_store, cell_id, "pluvial")
    irrigue = _advice(season_store, cell_id, "irrigue")
    assert [(a.id, a.evidence, a.crops) for a in irrigue] == [
        (a.id, a.evidence, a.crops) for a in pluvial
    ]
    for a in irrigue:
        assert a.variant == ("irrigue" if a.id in ATTENUATED else "pluvial")


def test_hot_spring_absent_where_heat_not_relevant(season_store):
    flat = [cid for cid, c in season_store.cells.items() if not c.heat_relevant]
    assert flat
    for cid in flat:
        assert "hot_spring" not in {a.id for a in _advice(season_store, cid)}


def test_number_of_cells_per_rule(season_store):
    counts = Counter(a.id for cid in season_store.cells for a in _advice(season_store, cid))
    assert counts == {
        "drought_tolerant": 87, "dry_autumn": 94, "dry_spring": 25, "hot_spring": 52,
        "last_season_dry": 71, "field_shift": 52, "wet_frequent": 3,
    }


def test_output_follows_table_order(season_store):
    order = list(CROPS)
    for cid in season_store.cells:
        ids = [a.id for a in _advice(season_store, cid)]
        assert ids == sorted(ids, key=order.index)
