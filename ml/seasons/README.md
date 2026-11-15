# Season-type model (AGRIQO v5)

Training side of the "season types" feature. The app only loads the exported runtime files in
`backend/app/seasons/model_files/`; the full spec is `docs/seasons/IMPLEMENTATION_SEASONS.md`.

## What the model does

It classifies each growing season (October to May, labelled by its end year: `2025` =
Oct 2024 to May 2025) of each NASA POWER grid cell (0.5° × 0.625°, about 50 × 60 km) into one of
4 season types: *sèche et chaude*, *normale et fraîche*, *normale et chaude*, *très humide et
fraîche*. The model is `StandardScaler` + `KMeans(k=4)` on 3 anomalies relative to each cell's own
1996–2025 normal: seasonal rainfall, mean root-zone soil wetness (GWETROOT) and spring heat days
(> 30 °C, March–May). It covers 102 cells in Morocco north of 29.5° N, 30 seasons each
(3060 rows, 1996–2025). There is no soil, crop, frost or vegetation data in it.

## Layout

```
ml/seasons/
  README.md
  notebook/agriqo-season-model-training-v5.ipynb   training notebook (source of truth)
  reports/v5/model_selection.csv                   the 24 candidate models and the selection metrics
  reports/v5/cells-by-region-and-season-types-2022.png
                                                   left: the 102 cells by region (Nord/Centre/Sud);
                                                   right: season type of every cell in 2022
  reports/v5/season-types-pca-scatter.png          all 3060 season × cell rows on 2 PCA axes, by type
  data/                                            LOCAL ONLY, gitignored (see below)
    power_cache/                                   raw NASA POWER JSON, 342 files, about 90 MB

backend/app/seasons/model_files/                   runtime files the backend loads
  season_model.joblib  season_model_meta.json  season_baseline.json  season_features.csv
  SHA256SUMS
```

> **`data/` is local only.** It is in `.gitignore` and must never be committed. It is not
> needed to run the app, only to retrain without downloading everything again.

## Retrain

1. Use the versions the backend pins (`IMPLEMENTATION_SEASONS.md` §6.1, notably
   `scikit-learn==1.6.1` and numpy 2.x). The backend refuses a model whose
   `sklearn_version` differs.
2. Open the notebook from `ml/seasons/notebook/`. In §1 Configuration, set
   `OUT = Path("../data")` when running locally (the default is `/kaggle/working` on Kaggle,
   otherwise `outputs/`). `CACHE` is `OUT / "power_cache"`, so it then points to
   `data/power_cache/` and the cached NASA POWER answers are reused instead of downloaded. A cache
   file is only reused for the same cell and the same `START`/`END` (its name is
   `<lat>_<lon>_<start>_<end>.json`).
3. Run all cells. The country outline is still downloaded from Natural Earth (§2); without
   network the notebook falls back to a plain rectangle, which changes the cells.
4. The outputs land in `OUT` (`data/`): the 4 runtime files and `model_selection.csv`. The
   last cell reloads them as a check.

## Export to the backend

1. Copy `season_model.joblib`, `season_model_meta.json`, `season_baseline.json` and
   `season_features.csv` from `data/` to `backend/app/seasons/model_files/`.
2. Regenerate the checksums, from `backend/app/seasons/model_files/`:
   `sha256sum season_model.joblib season_model_meta.json season_baseline.json season_features.csv > SHA256SUMS`
3. Update the hash constants the backend checks before `joblib.load`
   (`EXPECTED_SHA256` in `backend/app/seasons/constants.py`, per the spec §6.1 / §6.3), and the
   table in `IMPLEMENTATION_SEASONS.md` §3.
4. Copy `model_selection.csv` and the notebook plots to a new `reports/v<N>/`.
5. Check the non-regression values in the spec (§6.3 step 10, §12) still hold, or update them
   on purpose: a retrain can renumber the clusters, which is why only `label_map` names are
   used outside the loader.

`.gitattributes` marks `model_files/` as `-text`, so Windows checkouts do not convert line
endings and the hashes stay valid.
