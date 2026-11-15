"""Point -> NASA POWER cell (spec §6.4). Pure function, no I/O."""
from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal, Protocol

from app.seasons import constants as C

MatchStatus = Literal["ok", "proche", "hors_zone"]


class _HasCentre(Protocol):
    lat: float
    lon: float


@dataclass(frozen=True)
class CellMatch:
    status: MatchStatus
    cell_id: str  # the containing cell (ok) or the nearest one (proche, hors_zone)
    distance_deg: float  # point -> centre of that cell, rounded to 3 decimals


def _key(lat: float, lon: float) -> tuple[float, float]:
    return round(lat, 3), round(lon, 3)


def containing_centre(lat: float, lon: float) -> tuple[float, float]:
    """Centre of the grid cell containing the point (same grid as the notebook §2)."""
    i = round((lat - C.GRID_LAT0) / C.GRID_DLAT)
    j = round((lon - C.GRID_LON0) / C.GRID_DLON)
    return _key(C.GRID_LAT0 + C.GRID_DLAT * i, C.GRID_LON0 + C.GRID_DLON * j)


def locate(lat: float, lon: float, cells: Mapping[str, _HasCentre]) -> CellMatch:
    by_centre = {_key(c.lat, c.lon): cid for cid, c in cells.items()}
    cid = by_centre.get(containing_centre(lat, lon))
    if cid is not None:
        c = cells[cid]
        return CellMatch("ok", cid, round(math.hypot(lat - c.lat, lon - c.lon), 3))

    # Nearest cell by plain degrees (same distance as the notebook §7.4); ties -> lowest id.
    dist, cid = min((math.hypot(lat - c.lat, lon - c.lon), cid) for cid, c in cells.items())
    status: MatchStatus = "proche" if dist <= C.NEAR_MAX_DEG else "hors_zone"
    return CellMatch(status, cid, round(dist, 3))
