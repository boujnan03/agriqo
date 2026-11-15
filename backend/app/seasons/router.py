"""GET /api/seasons/zone (spec §6.5). No I/O during a request: everything is in the store."""
from __future__ import annotations

from collections import Counter
from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.seasons import constants as C
from app.seasons.advice import Water, build_advice
from app.seasons.grid import locate
from app.seasons.labels import TYPE_ORDER
from app.seasons.schemas import (
    AdviceOut, CountWindow, Counts, ModelInfo, NearestCell, Normals, Period, SeasonOut,
    ZoneCell, ZoneQuery, ZoneResponse,
)
from app.seasons.store import Cell, Season, SeasonStore

router = APIRouter(prefix="/api/seasons", tags=["seasons"])


def get_store(request: Request) -> SeasonStore:
    """The store loaded at startup (main.lifespan). Overridable in tests."""
    store = getattr(request.app.state, "seasons_store", None)
    return store if store is not None else SeasonStore.failed("modèle non chargé")


def _season_out(s: Season, normal_rain: float) -> SeasonOut:
    return SeasonOut(
        season=s.season, type=s.type, margin=round(s.margin, 2), borderline=s.borderline,
        rain_mm=round(s.rain_mm, 1),
        rain_pct_normal=round(100 * s.rain_mm / normal_rain),  # on unrounded values
        rain_autumn_mm=round(s.rain_autumn, 1), rain_spring_mm=round(s.rain_spring, 1),
        heat_spring_days=s.heat_spring, gwetroot_mean=round(s.gwetroot_mean, 2),
        t_mean_c=round(s.t_mean, 1),
    )


def _window(seasons: Sequence[Season]) -> CountWindow:
    by_type = Counter(s.type for s in seasons)
    return CountWindow(
        from_=seasons[0].season, to=seasons[-1].season, total=len(seasons),
        by_type={t: by_type.get(t, 0) for t in TYPE_ORDER},
    )


def _normals(cell: Cell) -> Normals:
    m = cell.mean
    return Normals(
        rain_mm=round(m["rain_mm"], 1), rain_autumn_mm=round(m["rain_autumn"], 1),
        rain_spring_mm=round(m["rain_spring"], 1), heat_spring_days=round(m["heat_spring"], 1),
        gwetroot_mean=round(m["gwetroot_mean"], 2), t_mean_c=round(m["t_mean"], 1),
    )


@router.get("/zone", response_model=ZoneResponse)
def zone(
    lat: float = Query(ge=-90, le=90, allow_inf_nan=False),
    lon: float = Query(ge=-180, le=180, allow_inf_nan=False),
    water: Water = Query("pluvial"),
    store: SeasonStore = Depends(get_store),
) -> ZoneResponse:
    if store.status != "ok":
        raise HTTPException(
            status_code=503,
            detail={"code": "model_unavailable", "message": store.error or "modèle indisponible"},
        )

    match = locate(lat, lon, store.cells)
    nearest = store.cells[match.cell_id]
    meta = store.meta
    common = dict(
        query=ZoneQuery(lat=lat, lon=lon, water=water),
        nearest_cell=NearestCell(
            id=nearest.id, lat=nearest.lat, lon=nearest.lon, distance_deg=match.distance_deg
        ),
        max_distance_deg=C.NEAR_MAX_DEG,
        model=ModelInfo(
            name=meta["model"], k=meta["k"], version=C.MODEL_VERSION,
            trained_at=meta["trained_at"], sklearn_version=meta["sklearn_version"],
        ),
        source=C.SOURCE,
    )
    if match.status == "hors_zone":
        return ZoneResponse(
            status="hors_zone", cell=None, reference=None, normals=None, last_season=None,
            history=[], counts=None, advice=[], **common,
        )

    seasons = store.seasons[nearest.id]
    history = [_season_out(s, nearest.mean["rain_mm"]) for s in seasons[-C.RECENT_WINDOW:]]
    return ZoneResponse(
        status=match.status,
        cell=ZoneCell(
            id=nearest.id, lat=nearest.lat, lon=nearest.lon, distance_deg=match.distance_deg,
            region=nearest.region, heat_relevant=nearest.heat_relevant,
        ),
        reference=Period(from_=seasons[0].season, to=seasons[-1].season),
        normals=_normals(nearest),
        last_season=history[-1],
        history=history,
        counts=Counts(
            recent=_window(seasons[-C.RECENT_WINDOW:]),
            before=_window(seasons[: -C.RECENT_WINDOW]),
            reference=_window(seasons),
        ),
        advice=[
            AdviceOut(
                id=a.id, variant=a.variant, crops=a.crops,
                needs_validation=a.needs_validation, evidence=a.evidence,
            )
            for a in build_advice(nearest, seasons, water)
        ],
        **common,
    )
