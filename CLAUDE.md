# CLAUDE.md — Field Shift (NASA Space Apps 2026, Beni Mellal)

## Project
MVP web app that helps a farmer in the Tadla plain (Beni Mellal, Morocco) compare
candidate crop rotations using NASA POWER daily data, with a transparent rule-based
score and a plain-language (French-first) explanation plus explicit limitations.
Hackathon: ~48 h, team of 3. **Working end-to-end > extra features.**

## Stack
Python 3.11+ · pandas · requests · Streamlit + streamlit-folium + plotly · pytest.
No database: JSON/CSV files only. No LLM (yet).

## Layout
- `app.py` — Streamlit UI, 4 tabs: Carte / Indicateurs / Comparaison / Explication & limites
- `src/power_client.py` — NASA POWER fetch, -999 → NaN, disk cache, offline fallback
- `src/features.py` — clean daily DataFrame → per-location features dict
- `src/scoring.py` — rule-based Water / Soil / Climate sub-scores (0–100) + weighted total
- `src/explain.py` — template-based explanation; strings in `TEXTS[lang]` (only `"fr"` now)
- `data/crops.json` — crop knowledge base (approximate, `needs_validation: true`)
- `data/rotations.json` — candidate rotations (editable)
- `data/fallback_beni_mellal.json` — raw POWER response for Beni Mellal (offline demo)
- `data/cache/` — POWER responses cache (gitignored)
- `docs/scoring.md` — every scoring rule, must stay in sync with `src/scoring.py`

## Commands (Windows, from repo root)
```
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python -m src.power_client      # smoke test: real API call (or fallback)
python -m pytest -q             # tests
streamlit run app.py            # app
```

## Conventions
- Never invent numbers: explanations only use values computed in `features`/`scoring`.
- Crop values are approximate (FAO-style); always keep `source` + `needs_validation`.
- Any change to a scoring rule → update the code comment AND `docs/scoring.md` AND tests.
- Clearly separate NASA data (POWER) from non-NASA data (crop table, rotations).
- POWER fill value -999 = missing. Growing season = Oct–May, labelled by the end year.
- UI text in French; add languages via `src/explain.py` `TEXTS` dict, not inline strings.
- Small, clear git commits; keep `streamlit run app.py` working after every commit.
- Tests must not hit the network (use fixtures / synthetic DataFrames).
