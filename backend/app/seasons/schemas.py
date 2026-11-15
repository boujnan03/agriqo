"""JSON shapes of /api/seasons/* (spec §6.5). camelCase on the wire; type ids stay snake_case."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.seasons.advice import Water

ZoneStatus = Literal["ok", "proche", "hors_zone"]


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ZoneQuery(_Camel):
    lat: float
    lon: float
    water: Water


class NearestCell(_Camel):
    id: str
    lat: float
    lon: float
    distance_deg: float


class ZoneCell(NearestCell):
    region: str
    heat_relevant: bool


class Period(_Camel):
    from_: int = Field(alias="from")
    to: int


class Normals(_Camel):
    """Cell normals over the reference period (baseline means), rounded for display."""
    rain_mm: float
    rain_autumn_mm: float
    rain_spring_mm: float
    heat_spring_days: float
    gwetroot_mean: float
    t_mean_c: float


class SeasonOut(_Camel):
    season: int  # end year: 2025 = Oct 2024 -> May 2025 (display "2024–2025")
    type: str
    margin: float
    borderline: bool
    rain_mm: float
    rain_pct_normal: int
    rain_autumn_mm: float
    rain_spring_mm: float
    heat_spring_days: int
    gwetroot_mean: float
    t_mean_c: float


class CountWindow(Period):
    total: int
    by_type: dict[str, int]  # keys: labels.TYPE_ORDER


class Counts(_Camel):
    recent: CountWindow
    before: CountWindow
    reference: CountWindow


class AdviceOut(_Camel):
    id: str
    variant: Water
    crops: list[str]
    needs_validation: bool
    evidence: dict[str, int | float]  # keys already camelCase (spec §6.5)


class ModelInfo(_Camel):
    name: str
    k: int
    version: str
    trained_at: str
    sklearn_version: str


class ZoneResponse(_Camel):
    status: ZoneStatus
    query: ZoneQuery
    nearest_cell: NearestCell
    max_distance_deg: float
    cell: ZoneCell | None
    reference: Period | None
    normals: Normals | None
    last_season: SeasonOut | None
    history: list[SeasonOut]
    counts: Counts | None
    advice: list[AdviceOut]
    model: ModelInfo
    source: str
