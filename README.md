# 🌾 Field Shift: Adapting Farms with NASA Data

NASA Space Apps Challenge 2026 · Beni Mellal, Morocco · Challenge: *Field Shift*

This prototype web app helps a farmer in the **Tadla plain** (Beni Mellal) compare
candidate crop rotations using 10 years of **NASA POWER** daily data. It scores each
rotation with transparent rules, then explains the result in plain French and shows
the method's limits and uncertainty.

## How it works
1. **Pick a field.** Click on the map. The default point is Beni Mellal (32.34, -6.35).
2. **Set priorities.** Sliders for water saving, soil health and climate suitability.
   The weights are normalised so they sum to 1.
3. **Fetch data.** The app downloads daily NASA POWER data for 2016–2025 and caches it
   in `data/cache/`.
4. **Compute features.** Oct–May growing-season rainfall, annual rainfall, heat days
   (Tmax > 35 °C), the longest dry spell, soil wetness (GWETTOP/GWETROOT) and how much
   rainfall varies from one season to the next (CV).
5. **Score rotations.** Water, soil and climate sub-scores (each 0–100) combine into a
   weighted total. If the top two are less than 3 points apart, the result is flagged
   "too close to call". The rules are in [docs/scoring.md](docs/scoring.md).
6. **Read the results.** Four tabs: Map · Environmental insights · Rotation comparison ·
   Explanation & limitations.

## Setup and run (Python 3.11+)
```bash
python -m venv .venv
.venv\Scripts\activate           # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt

python -m src.power_client       # smoke test: real API call (or offline fallback)
python -m src.features           # print the computed features for Beni Mellal
python -m src.scoring            # print the rotation scores (equal weights)
python -m pytest -q              # tests (no network needed)
streamlit run app.py             # the app → http://localhost:8501
```
**Offline demo:** use the "Mode hors-ligne" toggle in the sidebar, or set
`FIELDSHIFT_OFFLINE=1`. The app then uses the local cache or the bundled
Beni Mellal data in `data/fallback_beni_mellal.json`.

To regenerate the fallback file: `python -m src.power_client --build-fallback`.

## Editing the data
- `data/crops.json`: crop parameters (water need, tolerances, nitrogen and soil effects).
- `data/rotations.json`: candidate rotations, each a list of crop IDs, one per season.
  The list repeats in a cycle.

## Data sources

| Data | Source | NASA? |
|---|---|---|
| Daily climate (T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, GWETTOP, GWETROOT, RH2M, ALLSKY_SFC_SW_DWN) | [NASA POWER](https://power.larc.nasa.gov/) Daily API, community AG (MERRA-2, CERES/SYN1deg) | ✅ NASA |
| Crop parameters (water need, heat and drought tolerance, N and soil effect) | Approximate FAO-style values (FAO Irrigation & Drainage Papers 33/56, FAO crop water information) | ❌ not NASA; **needs validation** |
| Candidate rotations | Team assumptions for the Tadla plain | ❌ not NASA |
| Base map | OpenStreetMap | ❌ not NASA |

## Limitations
- **Resolution.** NASA POWER gives regional estimates on a grid of about 0.5° × 0.625°
  (~50 km). They are **not field-level** and don't capture irrigation, terrain, soil
  type or microclimate.
- **Period.** 2016–2025 gives 9 complete Oct–May seasons. The past does not predict
  the future climate.
- **Missing data.** Values of -999 count as missing. A season with less than 90%
  valid days is excluded. The app shows the share of missing data.
- **Crop values.** These are approximations flagged `needs_validation: true`. They
  must be checked by an agronomist (ORMVA Tadla, INRA, ONCA).
- **Simplified method.** The water balance only compares crop need with mean rainfall.
  It ignores ET₀, soil storage, irrigation efficiency, yields, prices and actual access
  to water from the dam.
- **Decision support only.** The tool helps people think and discuss. It does **not**
  replace local expertise or agricultural advice.

## Project structure
```
app.py                 Streamlit UI (4 tabs)
src/power_client.py    NASA POWER client, -999 → NaN, cache, offline fallback
src/features.py        feature extraction
src/scoring.py         rule-based scoring
src/explain.py         French templates (TEXTS["fr"]; add "ar" for Arabic/Darija)
data/                  crops.json, rotations.json, fallback_beni_mellal.json, cache/
docs/scoring.md        scoring rules + hand-computed example
tests/                 pytest suite
```
