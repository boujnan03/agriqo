# 🌾 Field Shift: Adapting Farms with NASA Data

NASA Space Apps Challenge 2026 · Beni Mellal, Morocco · Challenge: *Field Shift*

This prototype web app helps a farmer in the **Tadla plain** (Beni Mellal) compare
candidate crop rotations using 10 years of **NASA POWER** daily data. It scores each
rotation with transparent rules, then explains the result in plain French and shows
the method's limits and uncertainty.

> **Status (2026-11-14): rebuild in progress.** The Streamlit MVP described in *How it works*,
> *Data sources* and *Limitations* below has been **removed from the working tree**. It is intact
> in git commit `639732c`. The frontend is being rebuilt in React/TypeScript from
> [`frontend/design.md`](frontend/design.md). The NASA POWER + scoring pipeline will move into
> `backend/`. **What runs today:** Home's real map (Leaflet + OpenStreetMap) and Farm, Insights
> and Weather fed by the backend's real diagnostic and forecast routes. See
> [ARCHITECTURE.md](ARCHITECTURE.md) §8.

## How it works (Streamlit MVP, commit `639732c`)
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
   "too close to call". The rules are in `docs/scoring.md` at commit `639732c`
   (`git show 639732c:docs/scoring.md`).
6. **Read the results.** Four tabs: Map · Environmental insights · Rotation comparison ·
   Explanation & limitations.

## Run with Docker (one command)
```bash
docker compose up --build        # UI → http://localhost:8080 · backend → http://localhost:8000/health
```
The `frontend` container serves the React build through nginx. The `backend` container runs
the FastAPI service: `/health`, the parcel diagnostic and the 7-day forecast (see *Backend*
below; Home, Farm, Insights and Weather call it). Details: [ARCHITECTURE.md](ARCHITECTURE.md).

### Two modes: production-style (default) and hot-reload dev (opt-in)
- **Production-style (default):** `docker compose up --build` builds the frontend once and
  serves the static bundle through nginx. It does **not** see later source edits: after
  changing code, run `docker compose up --build` again, or the browser keeps the old bundle.
- **Hot-reload dev mode (opt-in, per machine):** copy the example override once:
  ```bash
  cp docker-compose.override.example.yml docker-compose.override.yml   # git-ignored
  docker compose up --build        # same URL: http://localhost:8080
  ```
  Compose merges `docker-compose.override.yml` automatically whenever it is present, so from
  then on the frontend runs Vite's dev server (`frontend/Dockerfile.dev`) on your mounted
  `frontend/` folder: edits under `frontend/src/` appear in the browser within a second or two,
  no rebuild or restart. The backend is unchanged.
  - Production-style run while the override exists: `docker compose -f docker-compose.yml up --build`.
  - Back to the default for good: delete `docker-compose.override.yml`.
  - After changing `frontend/package.json` dependencies: `docker compose up --build -V`
    (`-V` renews the container's own `node_modules` volume).

## Frontend development (Node ≥ 24.15)
```bash
cd frontend
npm ci
npm run dev          # http://localhost:5173
npm test             # Vitest + React Testing Library
npm run typecheck    # TypeScript
npm run lint         # ESLint
npm run format       # Prettier
```
Every screen and component follows [`frontend/design.md`](frontend/design.md). Design values
live only in `frontend/src/theme/tokens.ts`; run `npm run tokens` after editing it.

## Backend (FastAPI, Python 3.11)

Two endpoints serve real data. Spec:
[`docs/SPEC_Diagnostic_Parcelle.md`](docs/SPEC_Diagnostic_Parcelle.md).

| Endpoint | Returns | Sources |
|---|---|---|
| `POST /api/parcel/diagnostic` | `soil`, `climate`, `soil_moisture`, `terrain` blocks | ISRIC SoilGrids, **NASA POWER** (climatology + last 12 months daily), OpenTopography (SRTM GL1) |
| `GET /api/weather/forecast?lat=&lon=` | `today` + 7 `days` (condition key + lucide icon name) | Open-Meteo (not NASA: POWER can't forecast) |
| `GET /health` | `{"status": "ok"}` | none |

**Honesty rules.** Every block carries its own `status` and `source`:
- `ok`: real values. A value the source lacks is an explicit `null`.
- `indisponible`: failed, timed out (15 s per call) or not configured, with an `error` code.
- `pas_de_donnees`: the source answered but has nothing at that point (water, city…),
  with a `message`.

All four diagnostic calls run in parallel, so one slow or failing API never blocks the others.
No value is ever invented. Recommendations are out of scope (a teammate's ML model, attached
later); `previous_crop` and `polygon` are accepted but not used yet.

**Cache.** In memory, keyed by coordinates rounded to 3 decimals, with a different lifetime
per source:
- SoilGrids, SRTM and POWER climatology: 30 days.
- POWER daily: 6 h.
- Open-Meteo: 30 min.

Failures are never cached. The cache is lost on restart, which is accepted for the MVP
([`backend/app/cache.py`](backend/app/cache.py)).

**OpenTopography key (relief block).** Free:
1. Create an account at <https://portal.opentopography.org/newUser>.
2. On the MyOpenTopo dashboard, click "Get an API Key".
3. Put the key in a git-ignored `.env` at the repo root: `OPENTOPO_API_KEY=...`
   (template: [`.env.example`](.env.example)). `docker compose` passes it to the backend.

Without a key, `terrain` answers `indisponible` / `missing_api_key` and everything else works.

**Run standalone** (without Docker):
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate              # Windows (Git Bash); macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
export OPENTOPO_API_KEY=your-key    # PowerShell: $env:OPENTOPO_API_KEY = "your-key"
uvicorn app.main:app --reload --port 8000     # API docs: http://localhost:8000/docs
pytest                              # mocked HTTP only: the suite never touches the network
```

**Try it on the Tadla plain** (32.40, -6.45, farmland ~10 km NW of Béni Mellal):
```bash
curl -X POST http://localhost:8000/api/parcel/diagnostic \
  -H "Content-Type: application/json" \
  -d '{"lat": 32.40, "lon": -6.45, "previous_crop": null}'

curl "http://localhost:8000/api/weather/forecast?lat=32.40&lon=-6.45"
```
A real response from that call is saved in
[`docs/example_diagnostic_response.json`](docs/example_diagnostic_response.json). It was
captured without a working OpenTopography key, so `terrain` shows the real `indisponible`
answer. With a key set, `terrain` returns `altitude` and `slope_pct`.

> The city centre (32.34, -6.36), the spec's own "Tadla" example, returns **no soil data**:
> SoilGrids masks urban areas. Use a point in the fields around it.

**Known data caveats** (also in each block's `note`):
- SoilGrids values are ~250 m model estimates, not a lab analysis.
- POWER is ~50 km. `temp_max_c` is a typical maximum, not a record: the mean of the 12
  monthly `T2M_MAX_AVG` values (average daily high per month, 2001–2025). POWER's
  `T2M_MAX` would give the hottest single hour of the whole period. `frost_days` counts
  the days with T2M_MIN < 0 °C over the last 12 months of daily data.
- The soil-moisture labels (`sec` < 0.30 ≤ `moyen` < 0.60 ≤ `humide`, on GWETTOP) are a
  project choice that needs validation.
- SoilGrids can be slow: responses from 6 s to 40 s were seen on 2026-11-15, so it may show
  `indisponible` (timeout) until a point is cached.

## Data sources (Streamlit MVP; will move to the backend)

| Data | Source | NASA? |
|---|---|---|
| Daily climate (T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, GWETTOP, GWETROOT, RH2M, ALLSKY_SFC_SW_DWN) | [NASA POWER](https://power.larc.nasa.gov/) Daily API, community AG (MERRA-2, CERES/SYN1deg) | ✅ NASA |
| Crop parameters (water need, heat and drought tolerance, N and soil effect) | Approximate FAO-style values (FAO Irrigation & Drainage Papers 33/56, FAO crop water information) | ❌ not NASA; **needs validation** |
| Candidate rotations | Team assumptions for the Tadla plain | ❌ not NASA |
| Base map | OpenStreetMap | ❌ not NASA |

## Limitations (of the Streamlit MVP method)
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
docker-compose.yml              frontend (nginx :8080) + backend (:8000) services
ARCHITECTURE.md                 architecture, decisions, how to run (start at §8)
backend/                        FastAPI: /health, parcel diagnostic, weather forecast + Dockerfile
docs/                           diagnostic spec + a real example diagnostic response
frontend/                       React + TypeScript + Vite (+ Dockerfile, nginx.conf)
  design.md                     design system: source of truth
  src/theme/                    design tokens (tokens.ts → generated tokens.css)
  src/components/               shared components (Button, Card, Badge, TabBar, Header, …)
  src/router/  src/pages/       routes + tab config; one page per design.md §7 template
  src/services/                 api.ts: backend client (diagnostic, forecast, health)
  src/mocks/                    fixture data for the pages not on the backend yet (profile,
                                recommendations, cropDetails); illustrative, not NASA
  src/state/                    in-memory session: the parcel picked on Home + one shared
                                request cache (Home, Farm, Insights reuse one diagnostic)
  tests/                        Vitest + React Testing Library
```

```
agriqo
├─ .env.example
├─ .gitignore
├─ ARCHITECTURE.md
├─ audits
│  ├─ frontend_pages_audit_2026-11-15.md
│  ├─ mvp_audit_2026-11-14.md
│  ├─ output prompt1
│  ├─ output prompt2
│  ├─ output prompt3
│  ├─ output prompt4
│  └─ output prompt5
├─ backend
│  ├─ .dockerignore
│  ├─ app
│  │  ├─ __init__.py
│  │  ├─ cache.py
│  │  ├─ config.py
│  │  ├─ diagnostic.py
│  │  ├─ main.py
│  │  ├─ models.py
│  │  ├─ soil_texture.py
│  │  ├─ sources
│  │  │  ├─ __init__.py
│  │  │  ├─ _runner.py
│  │  │  ├─ openmeteo.py
│  │  │  ├─ opentopography.py
│  │  │  ├─ power.py
│  │  │  └─ soilgrids.py
│  │  └─ weather.py
│  ├─ Dockerfile
│  ├─ pytest.ini
│  ├─ requirements-dev.txt
│  ├─ requirements.txt
│  └─ tests
│     ├─ conftest.py
│     ├─ fixtures                (real API responses captured 2026-11-15)
│     ├─ test_core.py
│     ├─ test_diagnostic.py
│     └─ test_weather.py
├─ CLAUDE.md
├─ docker-compose.override.example.yml
├─ docker-compose.yml
├─ docs
│  ├─ example_diagnostic_response.json
│  └─ SPEC_Diagnostic_Parcelle.md
├─ frontend
│  ├─ .dockerignore
│  ├─ .prettierignore
│  ├─ .prettierrc
│  ├─ design.md
│  ├─ Dockerfile
│  ├─ Dockerfile.dev
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ nginx.conf
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ apple-touch-icon.png
│  │  ├─ favicon-16x16.png
│  │  ├─ favicon-32x32.png
│  │  ├─ favicon.ico
│  │  ├─ icons
│  │  │  ├─ icon-192.png
│  │  │  ├─ icon-512-maskable.png
│  │  │  └─ icon-512.png
│  │  └─ manifest.webmanifest
│  ├─ scripts
│  │  └─ generate-tokens-css.ts
│  ├─ src
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  ├─ illustrations
│  │  │  │  ├─ cover-field.jpg
│  │  │  │  ├─ crop-legumineuses.svg
│  │  │  │  ├─ crop-orge.svg
│  │  │  │  ├─ crop-wheat.svg
│  │  │  │  ├─ farm-map.svg
│  │  │  │  ├─ map-layer-rainfall.svg
│  │  │  │  ├─ map-layer-soil-moisture.svg
│  │  │  │  └─ map-layer-vegetation.svg
│  │  │  ├─ images.ts
│  │  │  └─ logo
│  │  │     ├─ logo-full.png
│  │  │     └─ logo-mark.png
│  │  ├─ components
│  │  │  ├─ Badge.module.css
│  │  │  ├─ Badge.tsx
│  │  │  ├─ Button.module.css
│  │  │  ├─ Button.tsx
│  │  │  ├─ Card.module.css
│  │  │  ├─ Card.tsx
│  │  │  ├─ DataCard.module.css
│  │  │  ├─ DataCard.tsx
│  │  │  ├─ FactList.module.css
│  │  │  ├─ FactList.tsx
│  │  │  ├─ Header.module.css
│  │  │  ├─ Header.tsx
│  │  │  ├─ Icon.tsx
│  │  │  ├─ index.ts
│  │  │  ├─ LanguageSwitcher.module.css
│  │  │  ├─ LanguageSwitcher.tsx
│  │  │  ├─ PhotoFrame.module.css
│  │  │  ├─ PhotoFrame.tsx
│  │  │  ├─ ProgressBar.module.css
│  │  │  ├─ ProgressBar.tsx
│  │  │  ├─ RequestStatus.module.css
│  │  │  ├─ RequestStatus.tsx
│  │  │  ├─ Screen.module.css
│  │  │  ├─ Screen.tsx
│  │  │  ├─ SegmentedControl.module.css
│  │  │  ├─ SegmentedControl.tsx
│  │  │  ├─ TabBar.module.css
│  │  │  └─ TabBar.tsx
│  │  ├─ i18n
│  │  │  ├─ ar.json
│  │  │  ├─ en.json
│  │  │  ├─ format.ts
│  │  │  ├─ fr.json
│  │  │  ├─ index.ts
│  │  │  ├─ useDirection.ts
│  │  │  └─ useFormat.ts
│  │  ├─ main.tsx
│  │  ├─ mocks
│  │  │  ├─ cropDetails.ts
│  │  │  ├─ profile.ts
│  │  │  └─ recommendations.ts
│  │  ├─ pages
│  │  │  ├─ BuildSmoke.tsx
│  │  │  ├─ Cover.module.css
│  │  │  ├─ Cover.tsx
│  │  │  ├─ CropDetail.module.css
│  │  │  ├─ CropDetail.tsx
│  │  │  ├─ Farm.module.css
│  │  │  ├─ Farm.tsx
│  │  │  ├─ home
│  │  │  │  ├─ ParcelMap.module.css
│  │  │  │  └─ ParcelMap.tsx
│  │  │  ├─ Home.module.css
│  │  │  ├─ Home.tsx
│  │  │  ├─ NotFound.module.css
│  │  │  ├─ NotFound.tsx
│  │  │  ├─ overview
│  │  │  │  ├─ ClimateChart.module.css
│  │  │  │  └─ ClimateChart.tsx
│  │  │  ├─ Overview.module.css
│  │  │  ├─ Overview.tsx
│  │  │  ├─ parcel
│  │  │  │  ├─ NoParcel.module.css
│  │  │  │  ├─ NoParcel.tsx
│  │  │  │  ├─ ParcelCoords.module.css
│  │  │  │  └─ ParcelCoords.tsx
│  │  │  ├─ placeholder
│  │  │  │  └─ placeholder.module.css
│  │  │  ├─ Profile.module.css
│  │  │  ├─ Profile.tsx
│  │  │  ├─ Recommendations.module.css
│  │  │  ├─ Recommendations.tsx
│  │  │  ├─ Weather.module.css
│  │  │  └─ Weather.tsx
│  │  ├─ router
│  │  │  ├─ AppLayout.tsx
│  │  │  ├─ AppTabBar.tsx
│  │  │  ├─ paths.ts
│  │  │  ├─ router.ts
│  │  │  ├─ routes.tsx
│  │  │  └─ tabs.ts
│  │  ├─ services
│  │  │  └─ api.ts
│  │  ├─ state
│  │  │  ├─ session.ts
│  │  │  ├─ SessionProvider.tsx
│  │  │  └─ useParcelData.ts
│  │  ├─ theme
│  │  │  ├─ cssVariables.ts
│  │  │  ├─ global.css
│  │  │  ├─ tokens.css
│  │  │  └─ tokens.ts
│  │  ├─ types
│  │  │  ├─ crop.ts
│  │  │  ├─ cropDetail.ts
│  │  │  ├─ diagnostic.ts
│  │  │  ├─ overview.ts
│  │  │  ├─ profile.ts
│  │  │  ├─ recommendations.ts
│  │  │  └─ weather.ts
│  │  └─ vite-env.d.ts
│  ├─ tests
│  │  ├─ assets
│  │  │  └─ assets.test.tsx
│  │  ├─ fakeBackend.ts           (stands in for the API; real captured responses)
│  │  ├─ fixtures                 (diagnostic_tadla/ocean, forecast_tadla: real, 2026-11-15)
│  │  ├─ components
│  │  │  ├─ Badge.test.tsx
│  │  │  ├─ Button.test.tsx
│  │  │  ├─ Card.test.tsx
│  │  │  ├─ DataCard.test.tsx
│  │  │  ├─ Header.test.tsx
│  │  │  ├─ Icon.test.tsx
│  │  │  ├─ PhotoFrame.test.tsx
│  │  │  ├─ ProgressBar.test.tsx
│  │  │  ├─ SegmentedControl.test.tsx
│  │  │  └─ TabBar.test.tsx
│  │  ├─ i18n
│  │  │  └─ i18n.test.tsx
│  │  ├─ pages
│  │  │  ├─ ClimateChart.test.tsx
│  │  │  ├─ Cover.test.tsx
│  │  │  ├─ CropDetail.test.tsx
│  │  │  ├─ Farm.test.tsx
│  │  │  ├─ Home.test.tsx
│  │  │  ├─ NotFound.test.tsx
│  │  │  ├─ Overview.test.tsx
│  │  │  ├─ Profile.test.tsx
│  │  │  ├─ Recommendations.test.tsx
│  │  │  ├─ routes.test.tsx
│  │  │  └─ Weather.test.tsx
│  │  ├─ setup.ts
│  │  ├─ theme
│  │  │  ├─ rtl.test.ts
│  │  │  └─ tokens.test.ts
│  │  └─ utils.tsx
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ tsconfig.test.json
│  └─ vite.config.ts
└─ README.md

```