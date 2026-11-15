# Field Shift — Design System (design.md)

> **Purpose**: this is the single source of truth for how Field Shift looks and behaves, visually. Every new screen, component, or feature — whoever builds it, whenever — must be built from the tokens and templates below, not from new one-off choices. If something isn't covered here, add it to this file first, then build it, so the next page inherits it too.

Reference: based on the "FieldShift AI" concept image (deep green + white + light-green tint, photo-first cards, bottom tab bar). Exact hex values below are read off that reference; swap them for the brand's real values if/when a formal brand kit exists.

---

## 1. Brand

- **Name**: Field Shift (shown in-product as "FieldShift AI")
- **Tagline**: "Smart Crop Rotation for a Sustainable Tomorrow"
- **Logo mark**: a stylized sprout/leaf over curved field rows, in the two greens below
- **Voice**: plain, reassuring, never overstates confidence (see §9 and the project's honesty requirements — scores and recommendations always carry their caveats, never presented as certainties)
- **UI languages**: Arabic (default), French, English — switchable, with every screen built for all three from the start, not patched in later. Arabic reads right-to-left; French and English read left-to-right (see §9a for what that changes). Every example label elsewhere in this document (e.g. "Recommended", "Best Crop for You") is illustrative and left in English for brevity — real copy exists in all three languages. Translate the *intent*, not the string: "Recommended" → "Recommandé" / "موصى به", "Best Crop for You" → "Meilleure culture pour vous" / "أفضل محصول لك", and so on.

## 2. Color Tokens

| Token | Hex | Use |
|---|---|---|
| `--green-900` | `#1E5631` | Primary buttons, logo, active tab icon/label, key headings on light bg |
| `--green-700` | `#4C9A4C` | Secondary green accents (chart lines, icon fills, gradients) |
| `--green-tint` | `#E3F3DE` | Light card backgrounds (featured/hero cards, badge pills, "why this choice" boxes) |
| `--white` | `#FFFFFF` | Card surfaces, base background |
| `--text-900` | `#1A1A1A` | Primary headings and body text |
| `--text-600` | `#6B7280` | Secondary/muted text (captions, labels, timestamps) |
| `--border` | `#E5E7EB` | Card borders, dividers, progress-bar tracks |
| `--tab-inactive` | `#9CA3AF` | Inactive bottom-tab icon and label |
| `--icon-water` | `#3B82F6` | Water/irrigation data icons only |
| `--icon-soil` | `#92653F` | Soil-type data icons only |
| `--icon-plant` | `#2E6B47` | Crop/plant data icons only |

Rule: `--green-900` is the only color used for primary actions (buttons, active states). The three `--icon-*` colors are **only** for small data-row icons (water/soil/crop facts) — never for buttons, headings, or anything interactive, so they stay recognizable as "a fact about your field," not "a thing you can tap."

## 3. Typography

- **Headings**: Inter or Poppins, weight 700–800. Screen titles 18–22px, hero titles (crop name, app name) 26–32px.
- **Body**: Inter, weight 400–500, 14–16px.
- **Buttons/labels**: Inter, weight 600, 15–16px.
- **Captions/muted**: Inter, weight 500, `--text-600`. Two explicit sizes, not a vague range — **11px** for purely decorative/non-essential chrome, **13px** for anything factual the farmer might rely on (a data-recency note, a unit label) that isn't full body text. When genuinely unsure which applies, default to 13px or body size rather than guessing small.
- Never go below 13px for anything the farmer must read to use the app (data values, button labels, recency notes).

## 4. Spacing, Radius, Shadow

- **Radius**: 16px on buttons and small chips, 20px on cards and photo frames, 999px (full) on badge pills.
- **Spacing scale**: 4 / 8 / 12 / 16 / 20 / 24 / 32px. Screen edge padding = 20px. Gap between stacked cards = 12–16px.
- **Shadow**: cards get one soft shadow only — `0 4px 12px rgba(0,0,0,0.06)`. Never stack multiple shadows, never use colored/glow shadows. Featured cards (green-tint background) skip the shadow — the tint already separates them.
- **Touch targets**: every tappable element ≥ 44×44px, no exceptions.
- **Line height**: 1.5 for body text, 1.2 for headings.
- **Max content width**: 480px, centered. These are mobile-first screens, not a desktop redesign — on anything wider than a phone they simply center with breathing room on each side, they don't reflow into a wider layout.

## 5. Iconography

- Style: simple **inline stroke icons**, 1.8px stroke, rounded caps/joins — never emoji, never filled/solid icon style, never photographic icons.
- Size: 18–20px inside buttons and tab bar, 22–24px inside data-row circles.
- Decorative icons get `aria-hidden="true"`; icon-only buttons get a real `aria-label`.

## 6. Core Components

**Primary button** — height 52–56px, radius 16px, `--green-900` fill, white bold text, optional trailing arrow icon. Full-width unless two buttons share a row.

**Secondary/text link** (e.g. "Sign In") — plain text, centered, `--text-600` (or white, if sitting on a photo).

**Outline button** (e.g. "Learn More", a non-committal action) — white fill, 1.5px `--green-900` border, `--green-900` text.

**Standard card** — white bg, radius 20px, 16–20px padding, soft shadow (§4), 1px `--border` optional.

**Featured/hero card** — `--green-tint` bg, radius 20px, 20px padding, no shadow. Used for the single "best option" in any ranked list (crop recommendation, best rotation, etc.) — there is only ever **one** featured card per screen; everything else is a standard card.

**Badge/pill** — radius 999px, 4–6px / 10–12px padding, `--green-tint` bg + `--green-900` text, bold, 13px (bumped from the original 12px so farmer-facing values like "85%" always clear the §3 readability minimum). Used for short status words ("Recommandé", "85%") — never for anything longer than ~2 words.

**Segmented control** — a row of mutually-exclusive, single-select options, built from real `<button>`s (`role="radiogroup"`/`role="radio"` or a native radio group under the hood), `--green-tint` bg for the group, the selected option in `--green-900` with white text, others transparent with `--text-900`. Same radius/padding rhythm as a `Badge` row, not a new shape. No page currently uses this — kept here in case a future feature needs it, rather than improvising a one-off pattern then.

**Data card** (Farm's 4 diagnostic cards — Sol, Climat, Humidité, Relief) — standard card styling (§6 above), plus two things every one of these cards must have: a small source caption naming where the value came from (e.g. "Données : NASA POWER", 13px, `--text-600`), and one of three required states — **ok** (show the real value), **indisponible** (the API failed, timed out, or is temporarily down — show "Donnée indisponible" in `--text-600`, never a blank space or a zero standing in for missing data), **pas de données** (the API responded but has nothing for this location — e.g. a point in the ocean — show the specific, plain-language reason, not the generic "indisponible" message). Never invent a value to paper over a gap — an absent number is shown as absent, per the project's honesty principle (§1).

**Request states** (any page whose data comes from our backend — Home's summary, Farm, Insights, Weather) — the state of the *request to our own backend*, shown as **one** standard card for the whole page, deliberately distinct from a Data card's `indisponible`: **loading** (the request is in flight — a short "loading your plot's data" line with a small spinner, `role="status"`, motion off under `prefers-reduced-motion`) and **error** (our backend couldn't be reached or answered with an HTTP error — a plain-language "can't reach the server" title + one-line explanation + an outline "Retry" button, `role="alert"`; nothing is shown in place of the data). `indisponible` means the backend answered and one of *its* sources failed — that is shown per card, by the Data card; a failed request to our backend must never be disguised as a page of "indisponible" cards, which would wrongly blame every data source.

**Progress / data bar** — track `--border`, 8px height, radius 4px, fill `--green-900` or `--green-700`. Always paired with the numeric value as text — the bar illustrates, it never replaces the number.

**Bottom tab bar** — fixed, ~64–72px tall, white bg, 1px top border (`--border`). Exactly these 5 destinations for the MVP, in this order: **Home · Farm · Insights · Weather · Profile**. Icon + label stacked; active = `--green-900` + bold label; inactive = `--tab-inactive`. Present on every top-level ("section root") screen; absent on drill-in/detail screens (those use the header back-arrow instead — see §7).

**Tab-to-route mapping (explicit, not inferred)**: **Home → `/home`** — the map/picker and a light, glanceable summary once a parcel is selected (§7 template 2). **Farm → `/farm`** — the full 4-card diagnostic for the selected parcel: Sol, Climat, Humidité, Relief (§7 template 3). **Insights → `/overview`** — statistics and charts (§7 template 4). **Weather → `/weather`** — the 7-day forecast for the same selected parcel, no separate picker (§7 template 8). **Profile → `/profile`** (§7 template 9). A page's purpose resembling "map" or "home" in casual conversation is not grounds to reassign it to a different tab than this table states. There is no separate "Map" tab — picking a parcel (Home) and the deep-dive on it (Farm) are deliberately two different tabs, not one merged page, per an explicit decision: Home is the quick entry point, Farm is where you go for the full picture.

**Header** — 56–60px tall. Section-root screens: title left-aligned, optional right-side icon (bell/profile). Drill-in screens: back chevron + title, no tab bar.

**Photo frame** — radius 16–20px, `object-fit: cover`, for every **in-card** photo (Farm banner, Recommendation thumbnails, Detail banner). The one exception is the **Cover** template's photo: it's full-bleed, filling the entire screen edge-to-edge, so it gets **no radius** — that's deliberate, not a gap. A text-bearing photo (the Cover screen, and the Detail banner when it carries a badge) gets a gradient only at the bottom edge, just enough for text legibility: `linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)` over the bottom ~40% of the frame — never a full-image tint.

## 7. Screen Templates

Every new screen must match one of these nine. If a genuinely new need doesn't fit any of them, that's a signal to add a 10th template here first — not to improvise inside an existing one.

1. **Cover** (Welcome/onboarding) — full-bleed photo, centered logo + title + tagline, primary button ("Commencer"/"Get started" → `/home`) + secondary link ("Se connecter"/"Sign in", non-functional for now) near the bottom. No header, no tab bar, **no authentication** — a login gate was tried here and explicitly reverted; don't reintroduce one unless asked again.
2. **Home** (the Home tab — map/picker + light summary) — a **real interactive map** (Leaflet, OpenStreetMap tiles — not a `PhotoFrame` illustration) on which the farmer **draws their parcel**: each tap adds a corner, "close the outline" makes it the parcel (at least 3 corners enclosing a real surface), "undo" and "clear" fix mistakes; the keyboard/screen-reader path is to pan with the arrow keys and add a corner at the map centre (shown by a crosshair), with a live status line saying what to do next. Then, once closed, a light summary: the parcel's centroid coordinates and approximate area (and a place name if easily available) plus one or two headline facts only (not the full diagnostic), then one primary CTA — "Voir le diagnostic complet" — to Farm. Header + tab bar (Home active). This is deliberately the "quick glance" page, not the deep one. The drawn parcel (corners + centroid) is shared app state, not local to this page — Farm, Insights, and Weather all need it. Point-based data (NASA POWER, SoilGrids, the forecast) uses the centroid; relief (OpenTopography) uses the polygon's real extent.
3. **Farm** (the Farm tab — the full diagnostic) — four `Data card`s (§6), one each for **Sol**, **Climat**, **Humidité**, **Relief**, for whichever parcel was picked on Home. No photo banner here — this page is data, not imagery. Header + tab bar (Farm active). If no parcel has been picked yet (the person reached Farm before Home), show a short empty state pointing back to Home rather than four empty/broken cards.
4. **Insights (Dashboard)** (the Insights tab) — stacked standard cards: a climate-summary stat row (mean/max temp, annual rainfall), a monthly chart card, a frost-days stat, and one or more progress-bar cards (soil moisture). A "Health Index" card may appear as an explicit placeholder (labelled as not yet available) until a real data source (NDVI) exists for it — never show a fabricated score standing in for real data. The same rule applies to the monthly chart: until the backend actually returns monthly values, the chart card is an explicit "not available yet" placeholder, never a chart of made-up months. Header + tab bar (Insights active).
5. **Recommendation list** (e.g. "Recommendations") — one featured card, a row of smaller option cards (photo + name + %), then a stepped plan list. Header with back-arrow, **no** tab bar — reached by drilling in from Insights, not from the tab bar directly. Out of scope for now (a teammate's ML model will drive this) — don't rebuild its content, only its shell if it needs to keep compiling.
6. **Detail** (e.g. a single crop's page) — photo banner, title + badge, icon-labeled fact rows, one explanation/"why" box, one primary CTA. Header with back-arrow, **no** tab bar.
7. **Error/Not found** — centered one-line plain-language message ("Page introuvable"), one primary button back to the Cover screen. No header, no tab bar.
8. **Weather** (the Weather tab) — for the same already-selected parcel, no separate picker. A small "today" summary at the top (icon, current temp, condition text, precipitation %/humidity/wind — reusing the `Data card` source/status rule if any of these can be unavailable), then a horizontal row of 7 day cards below it (day abbreviation, weather icon, high°/low°). No hourly breakdown, no Temperature/Precipitation/Wind tab-switching — daily only, kept simple. Header + tab bar (Weather active). Source: an external forecast API (not NASA POWER, which is historical/climatology only, not forward-looking) — name the source visibly, same honesty principle as every other real-data card. Conditions (keys sent by the backend, one distinct stroke icon + one translated label each): sunny, partly cloudy, cloudy, fog, drizzle, showers, rain, snow, thunderstorm, and an "unknown" fallback.
9. **Profile / Settings** (the Profile tab) — a profile summary card (name, location, email, phone), a short list of tappable setting rows (language, notifications, units — reusing the icon-labeled fact-row pattern from §2's data rows, with a trailing chevron to show they're actionable), a parcels summary (how many parcels diagnosed, linking back to Farm), then a secondary "sign out" action with no real auth behind it yet. Header + tab bar (Profile active).

**Retired**: the earlier "Map / Data layers" template (a satellite layer switcher: Végétation · Humidité du sol · Précipitations) is removed, not reused. There is no separate Map tab — picking a parcel now lives on Home, and the deep data for it lives on Farm as four honest data cards, which is a closer match to the real spec this app is built against than the layer-switcher idea was. Don't resurrect that pattern for Farm or Home; if spatial/layer visualization is wanted again later, it needs a fresh decision, not a revival of the old template.

## 8. Image / Photo Guidelines

Real photography is intended throughout (field shots, crop close-ups) but not yet produced. Until real images exist:

- **Placeholder convention**: a `--green-tint` rounded rectangle at the slot's real aspect ratio, with a small centered icon + a one-line label in `--text-600` naming exactly what's missing, e.g. "Photo: champ de blé". Never leave a slot visually empty or fake it with a flat color pretending to be a photo.
- **Aspect ratios to reserve**: Cover/welcome banner — tall, ~9:16 full-bleed; Home's map/picker banner — ~4:3; Recommendation option thumbnail — 1:1; Detail page banner — ~16:9. Farm and Weather are data-only (no photo slots); Insights and Profile likewise.
- When real photos are ready, they drop into these exact slots at these exact ratios with no layout changes.

## 9. Accessibility Baseline

- Text contrast ≥ 4.5:1 (≥ 3:1 only for text 24px and above).
- Every tappable element is a real `<button>` or `<a href>` — never a `div`/`span` with a click handler.
- Color is never the only signal — pair it with an icon, label, or position (e.g. the "Recommended" badge has text, not just a colored border).
- No content is understandable only by sound or color alone.
- **Focus ring**: every interactive element gets a visible `2px solid var(--green-900)` ring, 2px offset, on keyboard focus. Never remove the default outline without replacing it.
- **Hover** (pointer devices only, never required for usability since touch has no hover): a subtle 4% darken overlay on buttons and tappable cards.
- **Disabled**: 50% opacity + `cursor: not-allowed`, nothing else changes. This must stay visually distinct from an inactive-but-reachable tab (e.g. an unselected tab bar icon is not disabled — only a destination that genuinely doesn't exist yet, like Profile before it's built, gets disabled styling).

## 9a. Internationalization & RTL

- **Languages**: Arabic (default), French, English. A language switcher must be reachable from every screen.
- **Arabic is RTL**: when Arabic is active, the whole layout mirrors horizontally — reading direction, directional icons, and spacing.
- **Logical properties, not left/right**: every component uses CSS logical properties (`margin-inline-start`, `padding-inline-end`, `text-align: start`, etc.) instead of physical `left`/`right`/`margin-left`, so flipping `dir="rtl"` on the root mirrors the whole app automatically — no per-component RTL overrides.
- **Directional icons flip; non-directional ones don't**: the `Header` back-arrow points toward the start of reading direction — left in French/English, right in Arabic. The tab bar's icon-above-label layout is vertical and doesn't need mirroring, but the 4 destinations' left-to-right *order* mirrors with `dir`.
- **The `PhotoFrame` gradient (§6) always stays bottom-to-top** regardless of `dir` — it's a vertical effect, not a reading-direction one.
- **Typography**: Arabic needs its own type stack — Inter/Nunito don't cover Arabic script. Add a proper Arabic web font (e.g. Noto Sans Arabic, Cairo, or Tajawal — pick one with a weight range matching §3) applied automatically when Arabic is active. Never force a Latin font onto Arabic text or vice versa.
- **Numerals**: keep Western Arabic numerals (0–9) across all three languages for this MVP, not Eastern Arabic-Indic numerals — standard everyday practice in Morocco, and simpler to implement.
- **Copy source of truth**: every piece of UI text lives in translation files (one per language), never hardcoded in a component in any single language.

## 10. File & Naming Conventions (for whoever builds the real frontend)

- One file per screen, PascalCase, matching the screen's route/purpose (e.g. `FarmOverview`, `CropDetail`).
- Shared tokens (colors, spacing, radius) live in **one** stylesheet/theme file — never redefined per screen.
- Shared components (button, card, badge, tab bar, header) are built once and reused — never copy-pasted with small tweaks. If a screen seems to need a tweaked version of an existing component, that's a sign the component needs a documented variant here, not a one-off copy.

## 11. Checklist Before Adding Any New Page or Feature

1. Which of the 9 templates (§7) does this match? If none, propose the new template here first.
2. Does it only use tokens from §2–§6? If it needs a new color/component, add it to this file before building.
3. Tab bar or back-arrow header — which, per §7?
4. Any photo slots — placeholder per §8, correct aspect ratio reserved?
5. Touch targets, contrast, real interactive elements — per §9?
6. Every string in translation files (not hardcoded), and correct in RTL with Arabic as default — per §9a?