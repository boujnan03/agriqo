# Field Shift — Architecture

> **Read §8 first.** §1–§4 and §6 record the containerization step (2026-11-14), when the
> frontend was still the Streamlit MVP. The Streamlit code has since been deleted and replaced
> by a React + TypeScript + Vite scaffold (§8). Where an older section disagrees with §8, §8 is
> current. §5 (How to run) and §7 (Next step) are kept up to date.

## 1. Current State (before this change)

Until commit `639732c`, Field Shift was a **single Streamlit process** started with `streamlit run app.py` from the repo root. `app.py` called straight into `src/power_client.py` (NASA POWER API + disk cache + Beni Mellal fallback), `src/features.py`, `src/scoring.py` and `src/explain.py`. It read `data/*.json` and wrote only to `data/cache/`. There was no Docker, no backend server and no frontend/backend split. The only configuration was the env var `FIELDSHIFT_OFFLINE=1`, which is equivalent to the sidebar's offline toggle. Re-checked before changing anything: this matches `audits/mvp_audit_2026-11-14.md`, and there was no code drift since the audit. All file paths in the code come from `ROOT = Path(__file__).resolve().parent.parent` (the folder that contains `src/`), and all imports are `from src…` / `from tests…`. Because of this, the files could move as a group with **zero content changes**.

## 2. Target Architecture (this change)

*Superseded for the frontend: it is now a static React build served by nginx on port 8080, with
no NASA POWER calls and no cache volume. See §8.2. The backend part is unchanged.*

```
                 host
  ┌───────────────────────────────────────────────────────────────┐
  │  localhost:8501                         localhost:8000         │
  │       │                                       │                │
  │  ┌────▼──────────────────────┐   ┌────────────▼─────────────┐  │
  │  │ frontend  (Streamlit)     │   │ backend  (FastAPI)       │  │
  │  │ the whole current app:    │   │ GET /health → {"status": │  │
  │  │ app.py + src/ + data/     │   │              "ok"}       │  │
  │  │ calls NASA POWER directly │   │ no business logic        │  │
  │  └────┬──────────────────────┘   └──────────────────────────┘  │
  │       │ /app/data/cache        ◄── network "fieldshift" ──►    │
  │  ┌────▼──────────────────────┐   (frontend can reach           │
  │  │ volume: power-cache       │    http://backend:8000; it      │
  │  │ (NASA POWER JSON cache)   │    does not call it yet)        │
  │  └───────────────────────────┘                                 │
  └───────────────────────────────────────────────────────────────┘
         frontend ──HTTPS──► power.larc.nasa.gov  (unchanged)
```

```
repo-root/
├── docker-compose.yml        # 2 services, network "fieldshift", volume "power-cache"
├── .env.example              # FIELDSHIFT_OFFLINE
├── ARCHITECTURE.md
├── README.md                 # paths updated (see §3)
├── audits/                   # untouched (still references pre-move paths)
├── backend/
│   ├── app/__init__.py
│   ├── app/main.py           # FastAPI, GET /health only
│   ├── requirements.txt      # fastapi==0.115.6, uvicorn==0.34.0
│   ├── Dockerfile
│   └── .dockerignore
└── frontend/
    ├── app.py  src/  data/  docs/  tests/  requirements.txt   # moved as-is
    ├── Dockerfile
    └── .dockerignore
```

## 3. What Moved, and Why

Moves were done with `git mv`, so history follows the files. I checked that all 17 moved files are **byte-identical** by comparing git blob hashes before and after.

| Original path | New path | Changed? |
|---|---|---|
| `app.py` | `frontend/app.py` | moved only |
| `src/__init__.py`, `power_client.py`, `features.py`, `scoring.py`, `explain.py` | `frontend/src/…` | moved only |
| `data/crops.json`, `rotations.json`, `fallback_beni_mellal.json`, `cache/.gitkeep` | `frontend/data/…` | moved only |
| `tests/` (5 files) | `frontend/tests/` | moved only |
| `docs/scoring.md` | `frontend/docs/scoring.md` | moved only. Not in the proposed layout; see §6.1 |
| `requirements.txt` | `frontend/requirements.txt` | moved only |
| `data/cache/*.json` (local, untracked) | `frontend/data/cache/` | moved on disk only (not in git) |
| `.gitignore` | same | **edited:** `data/cache/*` → `frontend/data/cache/*` (and its `.gitkeep` exception), because the old pattern only matched at the root. Added `.env`. |
| `README.md` | same | **edited:** new "Run with Docker" section; local-run block now starts with `cd frontend`; scoring link, "Editing the data" heading and project tree updated |
| `CLAUDE.md` | same | **edited:** Layout and Commands sections reflect `frontend/` + `backend/` + compose. (Since then removed from the repo: it is a local, git-ignored file.) |
| — | `backend/**`, `frontend/Dockerfile`, `frontend/.dockerignore`, `docker-compose.yml`, `.env.example`, `ARCHITECTURE.md` | new |

**No import path or working-directory adjustment was needed.** `src/`, `data/*.json` and `tests/` are unchanged.

## 4. What Was Deliberately NOT Done

- **No backend business logic.** `backend/app/main.py` has exactly one route, `GET /health → {"status": "ok"}`. There is no `/score`, `/power`, `/features` or anything that touches data. FastAPI also serves its automatic `/docs`, `/redoc` and `/openapi.json` pages by default. These are framework built-ins, not project routes, and `/openapi.json` lists only `/health`.
- **The frontend does not call the backend.** It still runs NASA POWER fetch → features → scoring → explanation in-process, exactly as before.
- **No change to the scoring or data pipeline**, crop table, rotations, fallback file or tests.
- **No pinning or upgrading of frontend dependencies.** `requirements.txt` moved unchanged (see §6.4).
- No fixes for the issues listed in the audit (e.g. corrupt-cache crash, fallback cached by `st.cache_data`).
- No CI, reverse proxy, HTTPS, auth, or production hardening.

## 5. How to Run It

*Updated for the React frontend (§8). The Streamlit instructions that used to be here are obsolete.*

```bash
# from the repo root
cp .env.example .env              # optional; defaults work without it
docker compose up --build         # add -d to run in the background
```

- **UI:** http://localhost:8080. Placeholder routes: `/`, `/farm`, `/overview`, `/recommendations`, `/crop/<id>`. Build smoke page: `/__smoke`.
- **Backend health:** `curl http://localhost:8000/health` → `{"status":"ok"}`
- **Container health:** `docker compose ps` should show both services `healthy`. The frontend healthcheck fetches `/` from nginx; the backend's probes `/health`.
- **Frontend dev loop (Node ≥ 24.15):**
  ```bash
  cd frontend
  npm ci
  npm run dev          # Vite dev server, http://localhost:5173
  npm test             # Vitest + React Testing Library
  npm run typecheck    # tsc -b
  npm run lint         # ESLint
  npm run format       # Prettier (format:check to verify only)
  npm run tokens       # regenerate src/theme/tokens.css after editing tokens.ts
  ```
- **Leftover from the Streamlit era:** the `fieldshift_power-cache` Docker volume is no longer used. Remove it with `docker volume rm fieldshift_power-cache`.

For what was verified, see §8.6.

## 6. Open Decisions for the Team

*Status after §8: items 1–5, 7 and 10 concerned the deleted Streamlit frontend and are obsolete.
Items 6 and 8 still apply. Item 9 still applies, except that the frontend port is now 8080. Item 11:
the `.venv/` note still applies, and nothing has been committed yet. Frontend decisions are listed
in §8.4 and §8.5.*

1. **`docs/` moved into `frontend/`.** `src/scoring.py`, `src/explain.py` (user-facing text) and the tests refer to `docs/scoring.md` relative to the app root, so keeping it next to `src/` keeps those references true without editing them. When scoring moves to the backend, move the doc with it.
2. **Cache = named volume `power-cache`, not a bind mount.**
   - *Why:* the container runs as non-root (uid 1000). A named volume inherits the image's folder ownership on every OS, while a bind mount on a Linux host can be read-only for uid 1000. A failed cache write is caught by `power_client`'s broad `except`, so the app would silently show fallback data.
   - *Cost:* cache files already on the host (`frontend/data/cache/*.json`) are not visible in the container.
   - *To switch:* replace the volume line with `./frontend/data/cache:/app/data/cache`.
3. **`tests/` are shipped in the frontend image** (a few KB) so pytest can run in the container. Add `tests/` to `frontend/.dockerignore` to drop them.
4. **Frontend dependencies are unpinned (`>=`).** The image resolved **pandas 3.1.1, numpy 2.4.6, streamlit 1.67.0, plotly 7.1.0, folium 0.20.0, streamlit-folium 0.27.4**, which are newer major versions than the local dev setup (pandas 2.3, numpy 1.26). Everything passed and the numbers match, but any rebuild can pull a breaking release. **Recommended:** pin exact versions or add a lock/constraints file.
5. **Base image `python:3.11-slim`** (resolved to 3.11.18). This matches "Python 3.11+" in the README; the patch level floats.
6. **Backend pins `fastapi==0.115.6`, `uvicorn==0.34.0`.** These are known-stable releases chosen for reproducibility, not the latest. Review before building real endpoints.
7. **Streamlit flags added in the container:** `--server.headless=true` (no browser launch, no email prompt) and `--browser.gatherUsageStats=false` (telemetry off). Neither changes app behaviour.
8. **Compose project name is fixed** (`name: fieldshift`) so the image and volume names don't depend on the checkout folder's name.
9. **`depends_on: backend` affects start order only**, and both services use `restart: unless-stopped`. Ports 8501 and 8000 are fixed and will conflict if something else on the host already uses them.
10. The frontend container needs **outbound HTTPS to `power.larc.nasa.gov`**, unless offline mode is on.
11. **Housekeeping:**
    - The untracked root `.venv/` is broken on this machine (it points to a missing Python 3.13) and was left untouched. Create new venvs in `frontend/`.
    - The audit report's file references (`src/…:line`) now need a `frontend/` prefix.
    - Nothing has been committed yet.

## 7. Suggested Next Step

**Frontend (planned next):** build the 5 screens one prompt at a time, each from its `design.md` §7
template with fixture data in `src/mocks/`. Each screen replaces its placeholder page and deletes
its `PlaceholderNotice`.

**Backend (later):** build it by restoring logic from git, not rewriting it.
- **Where the code is:** the Streamlit pipeline was deleted from the working tree but is intact in
  commit `639732c`, at its original root paths: `src/power_client.py`, `features.py`, `scoring.py`,
  `explain.py`, `data/*.json`, `docs/scoring.md`, `tests/`. Example:
  `git show 639732c:src/scoring.py`, or `git checkout 639732c -- src data docs tests`, then move the
  files into `backend/`.
- **New endpoints:** thin FastAPI routes around those modules, e.g. `GET /power?lat&lon` →
  features summary and `POST /score` {weights, lat/lon} → `score_all` output. Use Pydantic models
  and validate inputs (lat/lon bounds). The POWER cache then lives in a backend volume.
- **Frontend side:** real calls go in `frontend/src/services/` (see `api.ts`). The backend first
  needs CORS for the frontend origin, or an nginx `/api` proxy (§8.5).
- **Regression check:** the old pipeline's test suite plus the audit numbers (Beni Mellal,
  default weights: C 82.6 · A 79.7 · B 63.0).

## 8. Frontend: Streamlit → React + TypeScript + Vite (2026-11-14)

**Design source of truth: [`frontend/design.md`](frontend/design.md).** Every token, component
and screen follows it. If something is missing there, add it to `design.md` first, then build it.

### 8.1 What changed and why

- **Stack:** the Streamlit MVP is replaced by **React 19.3 + TypeScript 6.0.3 + Vite 8.3**, with
  React Router 8.5, lucide-react stroke icons, and Inter self-hosted via `@fontsource/inter`.
  The production image is a static build served by **nginx 1.30**.
- **The Streamlit code was deleted outright, not archived.** `frontend/app.py`, `src/`, `data/`,
  `tests/`, `docs/` and `requirements.txt` were removed with `git rm`. Nothing needed them yet:
  the new frontend starts from mock data, and the backend has no logic yet. Nothing is lost: all of
  it is intact in commit **`639732c`** at its original root paths (see §7 for how to restore it into
  `backend/`). The untracked local NASA POWER cache files were deleted too; they can be
  re-downloaded.
- **Removed from compose:** `FIELDSHIFT_OFFLINE`, the `power-cache` volume, and port 8501. Nothing
  reads them any more.
- **`backend/` is unchanged:** still `GET /health` only.

### 8.2 Runtime

```
 browser ──► localhost:8080 ──► frontend container (nginx: static files, SPA fallback to index.html)
         └─► localhost:8000 ──► backend container  (FastAPI: GET /health)   [not called yet]
 both on Docker network "fieldshift"
```

`VITE_API_BASE_URL` (default `http://localhost:8000`) is a **build arg**. Vite bakes it into the
bundle, so changing it needs a rebuild. Only `src/services/api.ts` reads it, and nothing imports
that file yet.

### 8.3 `frontend/` structure

```
frontend/
├── design.md                 # design system: source of truth
├── index.html  vite.config.ts (+ Vitest config)  eslint.config.js  .prettierrc  .prettierignore
├── tsconfig.json             # references: tsconfig.app (src) · tsconfig.test (tests) · tsconfig.node (configs, scripts)
├── package.json  package-lock.json   # exact versions only
├── Dockerfile  nginx.conf  .dockerignore
├── scripts/generate-tokens-css.ts    # `npm run tokens`: tokens.ts → tokens.css
├── src/
│   ├── main.tsx  App.tsx  vite-env.d.ts
│   ├── theme/       tokens.ts (THE place design values live) · tokens.css (generated) · cssVariables.ts · global.css
│   ├── components/  Button · Card · Badge · ProgressBar · TabBar · Header · PhotoFrame · Icon · Screen (+ *.module.css, index.ts)
│   ├── router/      paths.ts · tabs.ts (tab → route mapping) · routes.tsx · router.ts · AppTabBar.tsx
│   ├── pages/       Welcome · YourFarm · FarmOverview · Recommendations · CropDetail (placeholders) · BuildSmoke · placeholder/ (temporary)
│   ├── services/    api.ts: documented placeholder, not wired
│   └── mocks/  hooks/  types/  assets/   # empty (.gitkeep) until pages need them
└── tests/
    ├── setup.ts  utils.tsx
    ├── components/  one smoke test per shared component
    ├── pages/       routes.test.tsx: each route renders the right header / tab bar (design.md §7)
    └── theme/       tokens.test.ts: tokens.css in sync · every var(--x) exists · no raw hex/px/rgb() outside src/theme
```

**Theme rule:** components style themselves only with `var(--…)` from `tokens.css`, or with
`tokens.ts` values in JS (icon size and stroke). `tests/theme/tokens.test.ts` fails if a hex
color, px value or `rgb()`/`hsl()` appears anywhere in `src/` outside `src/theme/`. I checked that
it really fails, using a throwaway leaking file.

| Route | design.md §7 template | Header | Tab bar | Page file |
|---|---|---|---|---|
| `/` | 1 Cover | none | none | `Welcome.tsx` |
| `/farm` | 2 Map/Data-entry | title | yes (Map active) | `YourFarm.tsx` |
| `/overview` | 3 Dashboard | title | yes (Home active) | `FarmOverview.tsx` |
| `/recommendations` | 4 Recommendation list | title | yes (Insights active) | `Recommendations.tsx` |
| `/crop/:id` | 5 Detail | back arrow → `/recommendations` | none | `CropDetail.tsx` |
| `/__smoke` | not a product screen | title | none | `BuildSmoke.tsx` |

Each page is a placeholder: the correct header/tab-bar combination, a heading, and a one-line
`PlaceholderNotice`. There is no real layout, copy or mock data yet.

### 8.4 Gaps in design.md (flagged, not filled silently)

Team decisions taken on 2026-11-14:
1. **Ranges → lower bound.** design.md gives many ranges (titles 18–22px, button 52–56px, tab
   bar 64–72px, …). `tokens.ts` records each range exactly; `fromRange()` picks the lower bound.
   Change that one function to change the policy.
2. **Tab → route mapping:** Home → `/overview`, Insights → `/recommendations`, Map → `/farm`.
   **Profile** has no §7 template, so it renders as a disabled button. design.md has no
   disabled style, so it looks identical to an inactive tab.

Resolved by me within design.md's own rules. Please confirm or correct in design.md:
3. Headings use **Inter** (§3 allows "Inter or Poppins"). The fallback stack `system-ui, sans-serif` is not in design.md.
4. Photo-frame radius: §4 says 20px, §6 says 16–20px. **20px** used.
5. Button text: §3 says weight 600, §6 says "bold". **600** used.
6. Tab-bar label size is not specified. The §3 "Buttons/labels" size (15px) is used.
7. Outline-button height is not specified. It uses the primary button height.
8. The placeholder icon size in PhotoFrame is not specified. The inline icon size is used.

Still open. Nothing was invented for these:
9. **Bottom gradient for text-bearing photos** (§6) has no color stops or height. It is not implemented, and the Cover page will need it.
10. **Cover is "full-bleed"** (§7.1), but photo frames have a radius (§4/§6). Is the radius 0 on the cover?
11. **Badge text is 12px (§6)**, but §3 forbids < 13px for anything the farmer must read, and badges carry values like "85%".
12. **Unspecified, so browser defaults are used:** line-height, focus ring, hover/pressed/disabled states, desktop max-width and breakpoints. There is also **no 404 page**: React Router's default error screen shows instead.
13. **UI language:** design.md uses English names (Home, Insights, …), but the project notes said "UI text in French". Labels are English, verbatim from design.md, and there is no i18n layer yet. Decide before the real pages are built.

### 8.5 Technical decisions to review

- **TypeScript 6.0.3, not 7.0.2.** TS 7 is the newest stable release, but typescript-eslint
  8.72 (the standard ESLint + TS setup) supports only `<6.1`. The current `create-vite`
  template has also switched from ESLint to oxlint; ESLint is used here because the task
  asked for it.
- **Frontend port 8080** (was 8501 for Streamlit). The Docker image runs `npm run build`
  (`tsc -b` + Vite), so a type error fails the image build. Lint and tests are not run during the
  image build; run them locally or in CI.
- **Base images:** `node:24-alpine` (floating minor) and `nginx:1.30-alpine`.
- **Backend calls from the browser will hit CORS** (frontend :8080 → backend :8000), because
  the backend has no CORS configuration. Fix this when the first real endpoint lands: either
  CORS middleware in FastAPI, or an nginx `/api` → `backend:8000` proxy.
- **`/__smoke` is public** in the production build. Remove it once real pages exist.
- Prettier runs with plain defaults (`.prettierrc` = `{}`). It never touches `*.md` (so it
  leaves `design.md` alone) or the generated `tokens.css`.

### 8.6 Verified on 2026-11-14

- **Local checks:** `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
  (10 files, 27 tests) all pass.
- **Docker:** `docker compose up --build` builds both images; both containers report healthy;
  `/health` returns 200; every route, including deep links, returns 200 from nginx.
- **Headless Edge render of the served build:** every route shows exactly its §7 header/tab-bar
  combination with the correct active tab, and Profile is disabled. Screenshots confirm tokens,
  Inter, icons and placeholders render.
- **Not verified:**
  - Layout on a real ~390px phone. Headless Edge enforces a minimum window width of about 500px;
    at 600px everything fits.
  - A build from a fresh clone, since nothing is committed yet. The build context is the working
    tree minus `.dockerignore`.
