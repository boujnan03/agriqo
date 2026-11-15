"""Season model store: load-time checks and the precomputed tables (spec §6.3, §12)."""
from __future__ import annotations

import json
import shutil
import warnings
from collections import Counter
from pathlib import Path
from unittest import mock

import pytest
import sklearn
from sklearn.pipeline import Pipeline

from app.seasons import constants as C
from app.seasons import store as store_module
from app.seasons.store import MODEL_DIR, RUNTIME_FILES, load_store, sha256_of

C057_1996_2025 = [
    "very_wet_cool", "very_wet_cool", "normal_cool", "dry_hot", "normal_cool", "normal_cool",
    "normal_cool", "normal_hot", "normal_cool", "dry_hot", "normal_hot", "normal_cool",
    "normal_cool", "very_wet_cool", "very_wet_cool", "very_wet_cool", "normal_hot",
    "very_wet_cool", "dry_hot", "normal_hot", "dry_hot", "dry_hot", "normal_cool", "dry_hot",
    "dry_hot", "dry_hot", "dry_hot", "dry_hot", "dry_hot", "dry_hot",
]


@pytest.fixture
def model_copy(tmp_path: Path) -> Path:
    """A private copy of the 4 runtime files, safe to corrupt."""
    for name in RUNTIME_FILES:
        shutil.copyfile(MODEL_DIR / name, tmp_path / name)
    return tmp_path


def test_store_ok_with_expected_shape(season_store):
    rows = [s for seasons in season_store.seasons.values() for s in seasons]
    assert season_store.status == "ok" and season_store.error is None
    assert len(season_store.cells) == 102
    assert len(rows) == 3060
    assert (season_store.first_season, season_store.last_season) == (1996, 2025)
    assert all(len(s) == 30 for s in season_store.seasons.values())


def test_type_counts_over_all_seasons(season_store):
    rows = [s for seasons in season_store.seasons.values() for s in seasons]
    assert Counter(s.type for s in rows) == {
        "dry_hot": 985, "normal_cool": 889, "normal_hot": 618, "very_wet_cool": 568,
    }


def test_borderline_count(season_store):
    rows = [s for seasons in season_store.seasons.values() for s in seasons]
    assert sum(s.margin < 0.15 for s in rows) == 322
    assert all(s.borderline == (s.margin < C.MARGIN_LIMIT) for s in rows)


def test_c057_sequence_matches_the_notebook(season_store):
    seasons = season_store.seasons["C057"]
    assert [s.season for s in seasons] == list(range(1996, 2026))
    assert [s.type for s in seasons] == C057_1996_2025


def test_heat_relevant_false_exactly_for_flat_spring_cells(season_store):
    flat = {cid for cid, c in season_store.cells.items() if not c.heat_relevant}
    assert flat == {"C035", "C046", "C059", "C066", "C072", "C078"}


def test_load_emits_no_sklearn_warning():
    """Predict with a DataFrame carrying the training column names: no feature-name warning,
    and the pickle matches the installed scikit-learn (no InconsistentVersionWarning)."""
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        assert load_store().status == "ok"


def test_predict_equals_nearest_centroid():
    """Check 9 runs at every load (the real store above passed it). Here predict() is made
    to disagree with the nearest centroid, to prove the check is enforced."""
    real_predict = Pipeline.predict

    def shifted(self, X, **kw):
        return (real_predict(self, X, **kw) + 1) % C.N_CLUSTERS

    with mock.patch.object(Pipeline, "predict", shifted):
        store = load_store()
    assert store.status == "error" and "centroïde" in store.error


def test_expected_hashes_match_sha256sums_file():
    lines = (MODEL_DIR / "SHA256SUMS").read_text(encoding="ascii").split("\n")
    sums = {name: digest for digest, name in (ln.split() for ln in lines if ln.strip())}
    assert sums == C.EXPECTED_SHA256
    assert {name: sha256_of(MODEL_DIR / name) for name in RUNTIME_FILES} == C.EXPECTED_SHA256


# --- failure cases: the app must report the cause, never crash, never unpickle a bad file ---

@pytest.mark.parametrize("name", RUNTIME_FILES)
def test_modified_file_fails_before_joblib_load(model_copy: Path, name: str):
    data = bytearray((model_copy / name).read_bytes())
    data[len(data) // 2] ^= 0x01  # one byte changed
    (model_copy / name).write_bytes(bytes(data))
    with mock.patch.object(store_module.joblib, "load") as joblib_load:
        store = load_store(model_copy)
    assert store.status == "error" and "SHA-256" in store.error and name in store.error
    joblib_load.assert_not_called()


def test_missing_file(model_copy: Path):
    (model_copy / C.BASELINE_FILE).unlink()
    store = load_store(model_copy)
    assert store.status == "error" and C.BASELINE_FILE in store.error


def test_wrong_sklearn_version(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(sklearn, "__version__", "1.5.0")
    with mock.patch.object(store_module.joblib, "load") as joblib_load:
        store = load_store()
    assert store.status == "error" and "1.5.0" in store.error
    joblib_load.assert_not_called()


def test_unknown_label_map(model_copy: Path):
    meta_path = model_copy / C.META_FILE
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta["label_map"]["0"] = "inconnue"
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    # Re-sign the edited meta so the run gets past the SHA-256 check to check 7.
    expected = {**C.EXPECTED_SHA256, C.META_FILE: sha256_of(meta_path)}
    store = load_store(model_copy, expected)
    assert store.status == "error" and "label_map" in store.error
