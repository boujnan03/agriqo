"""Load + check the season model once, then serve everything from memory (spec §6.2, §6.3).

The checks run in the spec's order and stop at the first failure. A failed load never
crashes the app: the store comes back with status "error" and its cause, /health still
answers 200 and the seasons routes answer 503.

Security: the files come from a FIXED path next to this module (never from a request or an
environment variable), and their SHA-256 is checked BEFORE joblib.load, because joblib (like
pickle) can execute code.
"""
from __future__ import annotations

import functools
import hashlib
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.cluster import KMeans
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.seasons import constants as C
from app.seasons.labels import LABEL_IDS, TYPE_ORDER

log = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).resolve().parent / "model_files"
RUNTIME_FILES = (C.MODEL_FILE, C.META_FILE, C.BASELINE_FILE, C.FEATURES_FILE)


class StoreError(Exception):
    """A load-time check failed; the message is the cause shown in the 503."""


@dataclass(frozen=True)
class Cell:
    id: str
    lat: float
    lon: float
    region: str
    mean: dict[str, float]  # baseline normals 1996-2025, NOT rounded
    std: dict[str, float | None]
    heat_relevant: bool


@dataclass(frozen=True)
class Season:
    season: int  # labelled by its end year: 2025 = Oct 2024 -> May 2025
    type: str  # stable id (labels.TYPE_ORDER)
    margin: float  # (d2 - d1) / d2 in the scaled space; low = borderline
    rain_mm: float
    rain_autumn: float
    rain_spring: float
    heat_spring: int
    gwetroot_mean: float
    t_mean: float
    heat_spring_anom: float

    @property
    def borderline(self) -> bool:
        return self.margin < C.MARGIN_LIMIT


@dataclass
class SeasonStore:
    status: str  # "ok" | "error"
    error: str | None = None
    cells: dict[str, Cell] = field(default_factory=dict)
    seasons: dict[str, list[Season]] = field(default_factory=dict)  # sorted by season
    first_season: int = 0
    last_season: int = 0
    meta: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def failed(cls, cause: str) -> SeasonStore:
        return cls(status="error", error=cause)


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def load_store(
    model_dir: Path = MODEL_DIR, expected_sha256: dict[str, str] | None = None
) -> SeasonStore:
    """Run every check and build the in-memory tables. Never raises."""
    try:
        store = _load(model_dir, expected_sha256 or C.EXPECTED_SHA256)
    except StoreError as exc:
        log.error("Season model not loaded: %s", exc)
        return SeasonStore.failed(str(exc))
    except Exception as exc:  # unexpected (corrupt CSV, ...): still never crash the app
        log.exception("Season model not loaded (unexpected error)")
        return SeasonStore.failed(f"erreur inattendue : {type(exc).__name__}: {exc}")
    log.info(
        "Season model loaded: %d cells, %d seasons (%d-%d)",
        len(store.cells), sum(len(s) for s in store.seasons.values()),
        store.first_season, store.last_season,
    )
    return store


@functools.cache
def get_default_store() -> SeasonStore:
    """The store for the fixed model_files/ folder, loaded once per process."""
    return load_store()


def _require(condition: bool, cause: str) -> None:
    if not condition:
        raise StoreError(cause)


def _load(model_dir: Path, expected_sha256: dict[str, str]) -> SeasonStore:
    paths = {name: model_dir / name for name in RUNTIME_FILES}

    # 1. The 4 runtime files exist.
    missing = [name for name, p in paths.items() if not p.is_file()]
    _require(not missing, f"fichiers manquants : {', '.join(missing)}")

    # 2. SHA-256 of every file, BEFORE anything is parsed or unpickled.
    for name, p in paths.items():
        actual = sha256_of(p)
        _require(
            actual == expected_sha256.get(name),
            f"empreinte SHA-256 inattendue pour {name} ({actual[:12]}…)",
        )

    meta = json.loads(paths[C.META_FILE].read_text(encoding="utf-8"))

    # 3. Library versions the pickle needs.
    _require(
        sklearn.__version__ == meta.get("sklearn_version"),
        f"scikit-learn {sklearn.__version__} installé, le modèle demande "
        f"{meta.get('sklearn_version')}",
    )
    _require(
        int(np.__version__.split(".")[0]) == C.NUMPY_MAJOR,
        f"numpy {np.__version__} installé, le modèle demande numpy {C.NUMPY_MAJOR}.x",
    )

    # 4. Unpickle (only now: the file is the one we checked).
    model = joblib.load(paths[C.MODEL_FILE])

    # 5. Pipeline(scaler=StandardScaler, cluster=KMeans(k=4)).
    _require(isinstance(model, Pipeline), "le modèle n'est pas un Pipeline scikit-learn")
    _require(
        [name for name, _ in model.steps] == ["scaler", "cluster"],
        f"étapes du Pipeline inattendues : {[name for name, _ in model.steps]}",
    )
    scaler, kmeans = model.named_steps["scaler"], model.named_steps["cluster"]
    _require(isinstance(scaler, StandardScaler), "l'étape « scaler » n'est pas un StandardScaler")
    _require(isinstance(kmeans, KMeans), "l'étape « cluster » n'est pas un KMeans")
    _require(
        kmeans.n_clusters == meta.get("k") == C.N_CLUSTERS,
        f"nombre de classes inattendu : modèle {kmeans.n_clusters}, meta {meta.get('k')}",
    )

    # 6. Input features, in order.
    _require(
        list(getattr(model, "feature_names_in_", [])) == meta.get("features") == C.MODEL_FEATURES,
        f"features inattendues : {list(getattr(model, 'feature_names_in_', []))}",
    )

    # 7. Class names -> stable ids.
    label_map: dict[str, str] = meta.get("label_map", {})
    _require(
        sorted(label_map) == [str(i) for i in range(C.N_CLUSTERS)]
        and sorted(label_map.values()) == sorted(LABEL_IDS),
        f"label_map inattendu : {label_map}",
    )
    order = [LABEL_IDS.get(name) for name in meta.get("label_order_dry_to_wet", [])]
    _require(order == TYPE_ORDER, f"label_order_dry_to_wet inattendu : {order}")
    cluster_type = {int(k): LABEL_IDS[v] for k, v in label_map.items()}

    # 8. Data consistency: baseline, coverage, CSV.
    baseline: dict[str, dict] = json.loads(paths[C.BASELINE_FILE].read_text(encoding="utf-8"))
    df = pd.read_csv(paths[C.FEATURES_FILE])
    expected_cols = (
        ["point", "season", *C.RAW_FEATURES, "lat", "lon", "region"]
        + [f"{f}_anom" for f in C.RAW_FEATURES]
    )
    missing_cols = [c for c in expected_cols if c not in df.columns]
    _require(not missing_cols, f"colonnes manquantes dans le CSV : {missing_cols}")

    points = set(df["point"])
    _require(set(baseline) == points, "les cellules de la baseline et du CSV diffèrent")
    _require(len(points) == meta.get("n_cells"), f"{len(points)} cellules, meta {meta.get('n_cells')}")

    def key(lat: float, lon: float) -> tuple[float, float]:
        return round(float(lat), 3), round(float(lon), 3)

    coverage = {key(la, lo) for la, lo in meta.get("coverage", {}).get("cells", [])}
    base_cells = {key(b["lat"], b["lon"]) for b in baseline.values()}
    _require(base_cells == coverage, "les cellules de la baseline et de meta.coverage diffèrent")

    first, last = (int(y) for y in meta.get("reference_seasons", (0, 0)))
    n_seasons = last - first + 1
    _require(len(df) == meta.get("n_samples") == len(points) * n_seasons,
             f"{len(df)} lignes dans le CSV, attendu {len(points) * n_seasons}")
    per_cell = df.groupby("point")["season"].apply(lambda s: sorted(s.astype(int)))
    expected_seasons = list(range(first, last + 1))
    bad = [p for p, s in per_cell.items() if s != expected_seasons]
    _require(not bad, f"saisons incomplètes ou en double pour {bad[:5]}")
    _require(not df[C.MODEL_FEATURES].isna().any().any(), "valeurs manquantes dans les features")

    grid = meta.get("grid", {})
    lats, lons = grid.get("lats", []), grid.get("lons", [])
    _require(
        bool(lats) and bool(lons)
        and lats[0] == C.GRID_LAT0 and lons[0] == C.GRID_LON0
        and all(abs(b - a - C.GRID_DLAT) < 1e-9 for a, b in zip(lats, lats[1:]))
        and all(abs(b - a - C.GRID_DLON) < 1e-9 for a, b in zip(lons, lons[1:])),
        "la grille de meta ne correspond pas à la grille NASA POWER attendue",
    )

    # 9. Predict all seasons in one call; predict == nearest centroid; margin.
    X = df[C.MODEL_FEATURES]  # DataFrame with the training column names (no sklearn warning)
    predicted = model.predict(X)
    scaled = scaler.transform(X)
    dist = np.linalg.norm(scaled[:, None, :] - kmeans.cluster_centers_[None, :, :], axis=2)
    _require(
        bool((dist.argmin(axis=1) == predicted).all()),
        "predict() ne correspond pas au centroïde le plus proche",
    )
    d_sorted = np.sort(dist, axis=1)
    margin = (d_sorted[:, 1] - d_sorted[:, 0]) / d_sorted[:, 1]

    df = df.assign(pred_type=[cluster_type[int(c)] for c in predicted], pred_margin=margin)

    cells: dict[str, Cell] = {}
    seasons: dict[str, list[Season]] = {}
    for point, rows in df.sort_values(["point", "season"]).groupby("point", sort=True):
        b = baseline[point]
        regions = set(rows["region"])
        _require(len(regions) == 1, f"plusieurs régions pour {point}")
        std_heat = b["std"].get("heat_spring")
        cells[point] = Cell(
            id=point, lat=float(b["lat"]), lon=float(b["lon"]), region=regions.pop(),
            mean={k: float(v) for k, v in b["mean"].items()},
            std={k: (None if v is None else float(v)) for k, v in b["std"].items()},
            heat_relevant=bool(std_heat)  # None or 0 -> no variation, hot/cool meaningless
            and float(b["mean"]["heat_spring"]) >= C.HEAT_RELEVANT_MIN_NORMAL_DAYS,
        )
        seasons[point] = [
            Season(
                season=int(r.season), type=r.pred_type, margin=float(r.pred_margin),
                rain_mm=float(r.rain_mm), rain_autumn=float(r.rain_autumn),
                rain_spring=float(r.rain_spring), heat_spring=int(round(r.heat_spring)),
                gwetroot_mean=float(r.gwetroot_mean), t_mean=float(r.t_mean),
                heat_spring_anom=float(r.heat_spring_anom),
            )
            for r in rows.itertuples(index=False)
        ]

    # 10. Non-regression (notebook validation §7.4): Tadla is dry_hot in 2016, 2023, 2024.
    check = {s.season: s.type for s in seasons.get(C.CHECK_CELL, [])}
    _require(
        all(check.get(y) == "dry_hot" for y in C.CHECK_DRY_HOT_SEASONS),
        f"non-régression : {C.CHECK_CELL} n'est pas « dry_hot » en {C.CHECK_DRY_HOT_SEASONS}",
    )

    return SeasonStore(
        status="ok", cells=cells, seasons=seasons,
        first_season=int(df["season"].min()), last_season=int(df["season"].max()), meta=meta,
    )
