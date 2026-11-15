# Field Shift Frontend — Page Prompts Audit

**Date of audit:** 2026-11-15
**Commits created in Step 1:** `3d76865` … `82856e1` (13 commits, table in §2). Nothing was fixed; this audit is the only new file and is **not committed**.

Method: every status below comes from reading the code at HEAD (`82856e1`), not from commit messages. Where a claim is an inference rather than a read, it says so. Paths are relative to `frontend/` unless noted.

## 1. Executive Summary

The five page prompts were followed closely: all five pages, their typed fixtures and their tests exist, every fixture value in the brief matches, French copy is used on all page bodies, and no raw hex/px/rgb values exist outside `src/theme/`. Typecheck, lint and all 52 tests pass. Two requirements in this audit's brief are **Deviated** and both come from one documented team decision in `src/router/tabs.ts`: on `/farm` the active tab is **Map** (brief: Home) and on `/overview` it is **Home** (brief: Insights). The single most important thing to settle before moving on is that tab mapping, because `design.md` §7.3/§7.4 and the brief both still describe a different one. Secondary issues: the tab bar and a few strings are English, "Se connecter" links back to the Cover, and `format:check` fails on Windows because of CRLF line endings.

## 2. Commits Made

The working tree arrived as one un-committed import of `agriqo/main` (no per-page history exists), so grouping is by file ownership. Shared files were not split or edited.

| # | Scope | Hash | Files included | Didn't fit cleanly |
|---|---|---|---|---|
| 1 | Docker / backend | `3d76865` | `backend/`, `docker-compose.yml`, `.env.example`, `frontend/Dockerfile`, `.dockerignore`, `nginx.conf` (10 files) | Not a page. Own commit. |
| 2 | Docs | `6762145` | `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `.gitignore`, `frontend/design.md` | Not a page. Own commit. |
| 3 | Frontend tooling | `7922dbc` | package.json/lock, tsconfigs, vite, eslint, prettier, `index.html`, `main.tsx`, `App.tsx`, `services/api.ts`, `tests/setup.ts`, `tests/utils.tsx`, `.gitkeep`s (22 files) | Not a page. Own commit. |
| 4 | Theme | `c77c51c` | `src/theme/*`, `tests/theme/tokens.test.ts` | Not a page. Own commit. |
| 5 | Shared components | `4b0301d` | `src/components/*` (incl. `FactList`), `tests/components/*` (28 files) | `FactList` is used by Farm **and** Crop Detail, so it is shared, not a page file. |
| 6 | **Cover + Error** | `23a8b42` | `Cover.tsx/.css`, `NotFound.tsx/.css`, `Cover.test.tsx`, `NotFound.test.tsx` | Their routes (`/`, `*`) live in the shared router file (commit 11). |
| 7 | **Farm** | `075c0eb` | `Farm.tsx/.css`, `mocks/farm.ts`, `types/farm.ts`, `Farm.test.tsx` | `/farm` route is in commit 11. |
| 8 | **Overview** | `de3c9e1` | `Overview.tsx/.css`, `overview/ClimateChart.*`, `mocks/overview.ts`, `types/overview.ts`, 2 tests | `/overview` route in commit 11. No chart dependency exists to include. |
| 9 | **Recommendations** | `a4fbc7a` | `Recommendations.tsx/.css`, `mocks/recommendations.ts`, `types/recommendations.ts`, test | `/recommendations` route in commit 11. `types/recommendations.ts` imports `./crop`, which is in commit 10. |
| 10 | **Crop Detail** | `e497911` | `CropDetail.tsx/.css`, `mocks/cropDetails.ts`, `types/cropDetail.ts`, `types/crop.ts`, test | `/crop/:id` route in commit 11. `types/crop.ts` is shared with Recommendations. |
| 11 | Shared router | `e66c37d` | `src/router/*` (routes, paths, tabs, AppTabBar), `pages/placeholder/*`, `pages/BuildSmoke.tsx`, `tests/pages/routes.test.tsx` | One file defines all 5 routes, so it can't be split per page without editing it. |
| 12 | Leftover pages | `a292ebb` | `Welcome.tsx`, `YourFarm.tsx`, `FarmOverview.tsx` | Not in `agriqo/main`; exist only in the local tree; imported by nothing. Committed separately, per the brief's rule. |
| 13 | Earlier audits | `82856e1` | `audits/mvp_audit_2026-11-14.md`, `audits/output prompt1…5` | Not a page. |

Not committed: `agriqo/` (a nested git clone; would be recorded as an embedded repo).

**Build-in-isolation caveat (my grouping, inferred from imports):** commits 6–10 import `../router/paths` / `AppTabBar` (commit 11) and commit 9 imports `types/crop` (commit 10). So the page commits are **not individually buildable or revertable** as the brief wanted; only HEAD is verified (§4). Reordering would be a history rewrite, so I did not do it.

## 3. Per-Page Compliance

### Cover (`/`)

| Requirement | Status | Note |
|---|---|---|
| Full-bleed `PhotoFrame` placeholder, no radius | Done | `src/pages/Cover.tsx:17-21` (slot `cover`, 9/16 via `tokens.ts:132`); `Cover.module.css:12-17` sets `border-radius: 0` and absolute `inset: 0`. |
| French app name, tagline | Done | `FieldShift AI` (`Cover.tsx:28`, brand name per design.md §1); tagline French (`:30`). |
| "Commencer" → `/farm` | Done | `Cover.tsx:34`; asserted in `Cover.test.tsx:24-34`. |
| "Se connecter" secondary link | Partial | Present and styled secondary/on-photo (`:38-40`) but `to={PATHS.cover}` sends the user to the page they are on. No auth destination exists; the comment at `:37` acknowledges this. |
| No `Header`, no `TabBar` | Done | Own `<main>`, no `Screen` header/tabBar; asserted `Cover.test.tsx:36-46`. |

Extra (not required): the §6 bottom gradient is applied in `Cover.module.css:20-26` via a page-level `::after` override.

### Error / Not found (catch-all)

| Requirement | Status | Note |
|---|---|---|
| "Page introuvable" message | Done | `NotFound.tsx:14` renders "Page introuvable." (trailing period). |
| One button → `/` | Done | `NotFound.tsx:15` "Retour à l'accueil" → `PATHS.cover`. |
| No `Header`, no `TabBar` | Done | `<Screen>` with no props (`:12`); asserted `NotFound.test.tsx:19`. |
| Catch-all route | Done | `PATHS.notFound = "*"` (`router/paths.ts`), last in `routes.tsx`. |

### Farm (`/farm`)

| Requirement | Status | Note |
|---|---|---|
| Typed fixture with required values | Done | `src/mocks/farm.ts:7-12` typed `FarmData`: Béni Mellal / Argileux / Limitée / Blé. |
| `Header`, no back-arrow | Done | `Farm.tsx:43` root variant (no `backTo`); asserted `Farm.test.tsx:36-41`. |
| `PhotoFrame` placeholder ~4:3 rounded + pin + location chip | Done | `Farm.tsx:46-57`; ratio `tokens.ts:132` (4/3); rounded via `PhotoFrame.module.css:2-6`; pin `MapPin` + `Badge` chip. |
| 3 icon fact rows with `--icon-soil/-water/-plant` | Done | `Farm.tsx:21-40` tones soil/water/plant → `FactList.module.css:28-38` map to those exact variables. |
| "Analyser ma ferme" → `/overview` | Done | `Farm.tsx:68`. |
| `TabBar` present, **Home** active | **Deviated** | TabBar present (`:43`), but active tab on `/farm` is **Map**: `router/tabs.ts:19-25` maps Home→`/overview`, Map→`/farm`; test asserts Map (`Farm.test.tsx:42-46`). Documented as a team decision (`tabs.ts:9-13`). |

### Overview (`/overview`)

| Requirement | Status | Note |
|---|---|---|
| Typed fixture matching shape/values | Done | `src/mocks/overview.ts:8-22`: avgTemp 24, totalRainfall 280, 6 months, soilMoisturePercent 68, healthIndex Bon/82. |
| Climate summary card | Done | `Overview.tsx:51-76`. |
| Chart with all 6 months' temp + rainfall | Done | `pages/overview/ClimateChart.tsx:44-72` renders one bar + one dot per month; labels `:75-83`; test `ClimateChart.test.tsx`. |
| Soil moisture + health index as `ProgressBar`s | Done | `Overview.tsx:87-100`; number always shown (`ProgressBar.tsx:34`). |
| "Voir mes recommandations" → `/recommendations` | Done | `Overview.tsx:102`. |
| `TabBar` present, **Insights** active | **Deviated** | TabBar present (`:48`); active tab is **Home** (`tabs.ts:19`, asserted `Overview.test.tsx:59-67`). Insights → `/recommendations` (`tabs.ts:20-24`), which has no tab bar. |
| Charting dependency pinned | N/A | None added: chart is hand-built SVG/CSS. All deps in `package.json` are exact (no `^`/`~`), read directly. |

### Recommendations (`/recommendations`)

| Requirement | Status | Note |
|---|---|---|
| Typed fixture: featured `ble`, `orge` 85, `legumineuses` 82, 3-year plan | Done | `src/mocks/recommendations.ts:8-21`. |
| `Header` back-arrow → `/overview` | Done | `Recommendations.tsx:30-36`; real `<Link>` (`Header.tsx:40-46`). |
| **No** `TabBar` (absent, not hidden) | Done | `<Screen>` is given no `tabBar` prop (`:29-38`), and `Screen.tsx:28` renders `{tabBar}` only if passed, so nothing is in the DOM; asserted `Recommendations.test.tsx:51-59`. |
| Featured + both option cards → `/crop/{id}` | Done | `:40-41`, `:70-71` via `cropPath`. |
| Rotation steps navigate | Done | `:107`. |
| Bottom button → `/crop/{featured.id}` | Done | `:126-128` "En savoir plus". |

### Crop Detail (`/crop/:id`)

| Requirement | Status | Note |
|---|---|---|
| Typed lookup covering `ble`, `orge`, `legumineuses`, distinct values | Done | `src/mocks/cropDetails.ts:8-41`, typed `Record<CropId, CropDetail>` (`types/cropDetail.ts:21`) so a missing id fails typecheck. Read all fields: description, waterNeed, bestSeason, expectedYield, whyThisChoice differ per crop. |
| `Header` back-arrow → `/recommendations` | Done | `CropDetail.tsx:58-63`. |
| **No** `TabBar` | Done | No `tabBar` prop (`:56-65`); asserted for all 3 ids (`CropDetail.test.tsx:46-49`). |
| "Recommandé" badge only for `ble` | Done | `:75`; only `ble` has `recommended: true`; test checks it per id (`:42-44`). |
| "Pourquoi ce choix ?" renders per-crop text | Done | `:85-92`. |
| Unknown `:id` → Not-found content | Done | `:26`; `Object.hasOwn` guard (`cropDetails.ts:44-45`) also blocks ids like `constructor`; test `:70-79` for `/crop/mais`. URL stays `/crop/mais` (no redirect). |

Extra (not required): an "Enregistrer ce plan" button with a local-only confirmation (`CropDetail.tsx:95-102`); it persists nothing.

### Across every page

| Requirement | Status | Note |
|---|---|---|
| All user-facing copy French | Partial | Page bodies are French. English remains in: tab labels Home/Insights/Map/Profile and `TAB_BAR_LABEL` "Main navigation" (`router/tabs.ts:15-27`; comment says design.md names kept verbatim; CLAUDE.md lists UI language as an open decision); `Build smoke test` page; `PlaceholderNotice` and the 3 leftover pages ("Welcome"); `index.html:2` `lang="en"`. |
| No raw hex/px/rgb outside `src/theme/` | Done | Automated test `tests/theme/tokens.test.ts:64-83` passes in the 52/52 run. Independent `grep` over `src/` outside the theme also returned nothing. |
| Each commit only touches its own page's files | Partial | Holds by construction (see §2), but cannot be verified from history (no per-page history exists). Inferred from content: Cover overrides shared `PhotoFrame` styling in its own CSS (`Cover.module.css:12-26`) instead of editing the component, and `PhotoFrame.tsx:38` still says the gradient is "not implemented yet", which is now stale. Cross-commit dependencies are listed in §2. |

## 4. Automated Checks

Run from `frontend/` at HEAD `82856e1`, Windows, Node via npm scripts.

| Check | Result |
|---|---|
| `npm run typecheck` | Pass (exit 0) |
| `npm run lint` | Pass (exit 0) |
| `npm test` | **Pass: 17 test files, 52 tests**, 25 s |
| `npm run format:check` | **Fail** (exit 1): 87 files flagged. Cause is line endings: `git ls-files --eol` shows index `lf`, working copy `crlf` (`core.autocrlf=true`). With `prettier --check --end-of-line crlf`, only the 3 leftover pages fail (their working copies are LF). Not a code-style problem. |
| Click-through | Run headlessly in jsdom via React Testing Library (`tests/pages/CropDetail.test.tsx:81-120`), **not in a real browser** (no browser tooling in `devDependencies`). Verified: `/` → Commencer → `/farm` → Analyser ma ferme → `/overview` → Voir mes recommandations → `/recommendations` → tap Orge → `/crop/orge` → back-arrow → `/recommendations` → back-arrow → `/overview`. Blé and Légumineuses are **not** tapped through in that flow; their pages are rendered by id and checked for distinct content (`it.each(CROPS)`, `:32-55`), and their back-link `href` is asserted. |

## 5. Deviations & Issues Found

- **Active-tab mismatch (2 requirements).** `/farm` activates Map, not Home (`router/tabs.ts:19-25`, `tests/pages/Farm.test.tsx:42-46`); `/overview` activates Home, not Insights (`Overview.test.tsx:59-67`). The Insights tab points at `/recommendations`, a page with no tab bar, so Insights can never appear active.
- **`design.md` is stale vs the code.** §7.4 still says Recommendation list = "Header + tab bar" (`design.md:87`); the implementation is back-arrow and no tab bar (`Recommendations.tsx:22-23` calls this a team decision overriding §7.4).
- **"Se connecter" is a no-op.** `Cover.tsx:38` links to `/`, the current page.
- **English remains in the UI shell.** Tab labels and nav landmark (`tabs.ts:15-27`), `index.html:2` (`lang="en"`), build-smoke and placeholder pages.
- **Fixture figures don't agree with their own monthly data.** `overview.ts`: stated `avgTemp` 24 vs mean of `monthly` 20.7; `totalRainfall` 280 vs sum 171. The fixture's comment says they are given, not computed, and they are illustrative, but a user can see the chart contradict the summary card.
- **Page commits aren't independently buildable** (my grouping, §2): they depend on the router commit and on `types/crop.ts` in the Crop Detail commit.
- **Dead code committed:** `Welcome.tsx`, `YourFarm.tsx`, `FarmOverview.tsx` (commit `a292ebb`) are imported by nothing; `PlaceholderNotice` is now used only by them.
- **`format:check` fails on Windows checkouts** due to CRLF; it would pass on LF. Related: Git warned that LF will become CRLF for the 3 leftover files.
- **Stale comment:** `components/PhotoFrame.tsx:38` says the bottom gradient isn't implemented, while Cover implements it per-page.
- **Unrequested extras (not defects):** Cover gradient, Crop Detail "Enregistrer ce plan" button.

## 6. Recommendations

1. **Decide the tab mapping** (Home/Insights/Map/Profile ↔ routes). Then align `tabs.ts`, the tests, `design.md` §7.3/§7.4 and the brief to one answer. This is the only item that changes what the audit brief calls correct.
2. **Decide the UI language for the shell** (tab labels, nav landmark, `lang`), since CLAUDE.md marks it open; then translate or document the exception.
3. **Give "Se connecter" a destination or hide it** until auth exists.
4. **Delete or keep the 3 leftover pages and `PlaceholderNotice`.** They are unreferenced; if removed, revert `a292ebb` and drop the placeholder folder.
5. **Make `format:check` pass on Windows:** add `.gitattributes` (`* text=auto eol=lf`) or set `endOfLine` in `.prettierrc`, then re-run; this is a config choice for the team.
6. **Reconcile fixture figures** (24 °C / 280 mm vs the monthly series), or label the summary as illustrative.
7. **If independently revertable page commits matter,** reorder history so the router/types come first. This rewrites unpushed local commits, so only do it deliberately.
8. **Update the stale `PhotoFrame.tsx:38` comment** when the gradient decision is made, and run the click-through once in a real browser (Playwright is not installed).
