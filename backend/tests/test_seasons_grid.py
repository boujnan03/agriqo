"""Point -> cell matching: the 18 rows of spec §6.4 + the 0.5° boundary."""
from __future__ import annotations

import pytest

from app.seasons.grid import locate

# (place, lat, lon, status, cell, distanceDeg) — spec §6.4, "Résultats attendus".
CASES = [
    ("Béni Mellal", 32.34, -6.35, "ok", "C057", 0.189),
    ("Tadla", 32.34, -6.36, "ok", "C057", 0.194),
    ("Kasba Tadla", 32.60, -6.27, "ok", "C057", 0.102),
    ("Fquih Ben Salah", 32.50, -6.69, "ok", "C056", 0.185),
    ("Bin el Ouidane", 32.10, -6.45, "ok", "C045", 0.224),
    ("Khouribga", 32.88, -6.91, "ok", "C069", 0.125),
    ("Settat", 33.00, -7.62, "ok", "C068", 0.12),
    ("Casablanca", 33.59, -7.62, "ok", "C079", 0.15),
    ("Rabat", 34.02, -6.84, "ok", "C089", 0.04),
    ("Meknès", 33.89, -5.55, "ok", "C091", 0.133),
    ("Fès", 34.03, -5.00, "ok", "C092", 0.03),
    ("Marrakech", 31.63, -8.01, "ok", "C032", 0.174),
    ("Agadir", 30.42, -9.60, "ok", "C012", 0.239),
    ("Oujda", 34.68, -1.91, "ok", "C105", 0.183),
    ("Tanger", 35.77, -5.80, "proche", "C113", 0.322),
    ("Océan", 33.00, -9.50, "hors_zone", "C066", 0.75),
    ("Sahara", 30.00, -5.00, "hors_zone", "C037", 1.5),
    ("Dakhla", 23.70, -15.90, "hors_zone", "C000", 8.73),
]


@pytest.mark.parametrize("place, lat, lon, status, cell, dist", CASES, ids=[c[0] for c in CASES])
def test_locate_matches_spec_table(season_store, place, lat, lon, status, cell, dist):
    m = locate(lat, lon, season_store.cells)
    assert (m.status, m.cell_id, m.distance_deg) == (status, cell, dist)


def test_exactly_half_a_degree_outside_every_cell_is_proche(season_store):
    # 36.0, -5.625 is the centre of a grid cell that is NOT one of the 102 (north of C113),
    # exactly 0.5° from C113's centre: the limit is inclusive.
    m = locate(36.0, -5.625, season_store.cells)
    assert (m.status, m.cell_id, m.distance_deg) == ("proche", "C113", 0.5)


def test_just_beyond_half_a_degree_is_hors_zone(season_store):
    m = locate(36.001, -5.625, season_store.cells)
    assert (m.status, m.cell_id) == ("hors_zone", "C113")
