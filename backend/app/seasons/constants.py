"""Named constants of the season-type model (docs/seasons/IMPLEMENTATION_SEASONS.md).

Any change to an advice threshold must also update docs/seasons_rules.md and the tests
(same rule as for scoring in CLAUDE.md).
"""
from __future__ import annotations

# --- Runtime files (backend/app/seasons/model_files/) --------------------------------------
# SHA-256 of each file, copied from model_files/SHA256SUMS (spec §3). Checked BEFORE
# joblib.load: joblib, like pickle, can run code. A test keeps these in sync with SHA256SUMS.
MODEL_FILE = "season_model.joblib"
META_FILE = "season_model_meta.json"
BASELINE_FILE = "season_baseline.json"
FEATURES_FILE = "season_features.csv"

EXPECTED_SHA256: dict[str, str] = {
    MODEL_FILE: "3a2e0e21d45758e85a8651b271572d6e65c8423f3bb5a05fd1ca09ee493ae40c",
    META_FILE: "eacfe8d19bb4a836b5274d6b044980d275a69b744df20e8eb82a0622b8e8dfbb",
    BASELINE_FILE: "9b98dc41c5b28683f233b083d06979d0fc304b65abe141c81904dcbf498373ec",
    FEATURES_FILE: "9fb599d408ec04a0504cd3752a0b7aa93a093b4fafc612e059bb62b2ff31ba03",
}

# --- Model facts (checked against the files at load time, spec §6.3) -----------------------
N_CLUSTERS = 4
MODEL_FEATURES = ["rain_mm_anom", "gwetroot_mean_anom", "heat_spring_anom"]
RAW_FEATURES = [
    "rain_mm", "t_mean", "heat_days", "max_dry_spell",
    "gwetroot_mean", "rain_autumn", "rain_spring", "heat_spring",
]
MODEL_VERSION = "v5"  # not in the meta file: the name of this export
SOURCE = "NASA POWER daily API (community AG), modèle AGRIQO v5"
NUMPY_MAJOR = 2  # a pickle made with numpy 2 does not load with numpy 1.x

# NASA POWER grid used by the notebook (§2): cell centres at LAT0 + i*DLAT, LON0 + j*DLON.
GRID_LAT0 = 29.5
GRID_LON0 = -9.375
GRID_DLAT = 0.5
GRID_DLON = 0.625

# Non-regression check at load time (notebook validation §7.4).
CHECK_CELL = "C057"
CHECK_DRY_HOT_SEASONS = (2016, 2023, 2024)

# --- Display / matching ----------------------------------------------------------------------
RECENT_WINDOW = 10  # "recent" = the last 10 seasons of the CSV (derived, not hard-coded years)
MARGIN_LIMIT = 0.15  # margin below this -> "borderline" classification
NEAR_MAX_DEG = 0.5  # nearest cell farther than this -> "hors_zone"
HEAT_RELEVANT_MIN_NORMAL_DAYS = 1.0  # spring heat normal below this -> hot/cool meaningless

# --- Advice thresholds (spec §8). All advice is needs_validation: pending an agronomist. ----
DRY_SEASONS_MIN = 4
AUTUMN_BELOW_MIN = 6
AUTUMN_PCT_MAX = 85
SPRING_BELOW_MIN = 6
SPRING_PCT_MAX = 90
HOT_SPRING_ABOVE_MIN = 6
HOT_SPRING_ANOM_MIN = 0.3  # mean over the recent window of heat_spring_anom (from the CSV)
WET_SEASONS_MIN = 3
SHIFT_DRY_MIN = 5
SHIFT_SHARE_GAP = 0.30
