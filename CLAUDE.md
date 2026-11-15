# CLAUDE.md — Field Shift (NASA Space Apps 2026, Beni Mellal)

## Project
MVP web app that helps a farmer in the Tadla plain (Beni Mellal, Morocco) compare
candidate crop rotations using NASA POWER daily data, with a transparent rule-based
score and a plain-language (French-first) explanation plus explicit limitations.
Hackathon: ~48 h, team of 3. **Working end-to-end > extra features.**

## Stack
- **Frontend** (`frontend/`): React 19 + TypeScript 6 + Vite 8, React Router 8, lucide-react,
  Vitest + React Testing Library, ESLint + Prettier. Production: static build served by nginx.
- **Backend** (`backend/`): FastAPI + httpx. `POST /api/parcel/diagnostic` (SoilGrids, NASA POWER,
  OpenTopography) and `GET /api/weather/forecast` (Open-Meteo); spec in `docs/SPEC_Diagnostic_Parcelle.md`.
  Every block has `status` (`ok`/`indisponible`/`pas_de_donnees`) + `source`; never invent values.
  Tests: `cd backend && pytest` (respx mocks, network blocked). No recommendations (teammate's ML, later).
- No database. No LLM (yet). See `ARCHITECTURE.md` (start at §8).

## Layout
- `frontend/design.md` — **design system, single source of truth** for every screen/component.
- `frontend/src/theme/tokens.ts` — the ONLY place design values live; `tokens.css` is generated
  from it (`npm run tokens`). Tests fail on raw hex/px/rgb() anywhere else in `src/`.
- `frontend/src/components/` — shared components (design.md §6); `router/` — routes + tab config;
  `pages/` — one file per screen (currently placeholders); `mocks/` — page fixture data;
  `services/` — future backend calls (placeholder only).
- The old Streamlit pipeline (NASA POWER client, features, scoring, explain, crops/rotations
  data, `docs/scoring.md`, pytest suite) was deleted from the tree; it is intact in commit
  `639732c` and is meant to be restored into `backend/` later (ARCHITECTURE.md §7).

## Commands (Windows)
```
docker compose up --build       # from repo root: UI :8080, backend /health :8000

cd frontend                     # everything below runs from frontend/ (Node >= 24.15)
npm ci
npm run dev                     # dev server :5173
npm test                        # vitest
npm run typecheck && npm run lint && npm run format:check
npm run tokens                  # after editing src/theme/tokens.ts
```

## Conventions
- New screen/component → follow `frontend/design.md` §11 checklist; never hardcode design values.
- Never invent numbers: explanations only use values computed in `features`/`scoring`.
- Crop values are approximate (FAO-style); always keep `source` + `needs_validation`.
- Any change to a scoring rule → update the code comment AND `docs/scoring.md` AND tests.
- Clearly separate NASA data (POWER) from non-NASA data (crop table, rotations).
- POWER fill value -999 = missing. Growing season = Oct–May, labelled by the end year.
- UI language: French-first was the original rule, but design.md uses English labels; this is
  an OPEN decision (ARCHITECTURE.md §8.4 #13) — ask before writing real page copy.
- Small, clear git commits; keep `docker compose up --build` working after every commit.
- Tests must not hit the network (use fixtures / mocks).
