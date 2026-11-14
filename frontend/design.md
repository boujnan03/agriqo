# Field Shift — Design System (design.md)

> **Purpose**: this is the single source of truth for how Field Shift looks and behaves, visually. Every new screen, component, or feature — whoever builds it, whenever — must be built from the tokens and templates below, not from new one-off choices. If something isn't covered here, add it to this file first, then build it, so the next page inherits it too.

Reference: based on the "FieldShift AI" concept image (deep green + white + light-green tint, photo-first cards, bottom tab bar). Exact hex values below are read off that reference; swap them for the brand's real values if/when a formal brand kit exists.

---

## 1. Brand

- **Name**: Field Shift (shown in-product as "FieldShift AI")
- **Tagline**: "Smart Crop Rotation for a Sustainable Tomorrow"
- **Logo mark**: a stylized sprout/leaf over curved field rows, in the two greens below
- **Voice**: plain, reassuring, never overstates confidence (see §9 and the project's honesty requirements — scores and recommendations always carry their caveats, never presented as certainties)
- **UI language**: French, matching the rest of the product. Every example label elsewhere in this document (e.g. "Recommended", "Best Crop for You") is illustrative and left in English for brevity — real copy is always French. Translate the *intent*, not the string: "Recommended" → "Recommandé", "Best Crop for You" → "Meilleure culture pour vous", and so on.

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
- **Captions/muted**: Inter, weight 500, 11–13px, `--text-600`.
- Never go below 13px for anything the farmer must read to use the app (data values, button labels). Captions below that size are decorative only.

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

**Progress / data bar** — track `--border`, 8px height, radius 4px, fill `--green-900` or `--green-700`. Always paired with the numeric value as text — the bar illustrates, it never replaces the number.

**Bottom tab bar** — fixed, ~64–72px tall, white bg, 1px top border (`--border`). Exactly these 4 destinations for the MVP: **Home · Insights · Map · Profile**. Icon + label stacked; active = `--green-900` + bold label; inactive = `--tab-inactive`. Present on every top-level ("section root") screen; absent on drill-in/detail screens (those use the header back-arrow instead — see §7).

**Header** — 56–60px tall. Section-root screens: title left-aligned, optional right-side icon (bell/profile). Drill-in screens: back chevron + title, no tab bar.

**Photo frame** — radius 16–20px, `object-fit: cover`, for every **in-card** photo (Farm banner, Recommendation thumbnails, Detail banner). The one exception is the **Cover** template's photo: it's full-bleed, filling the entire screen edge-to-edge, so it gets **no radius** — that's deliberate, not a gap. A text-bearing photo (the Cover screen, and the Detail banner when it carries a badge) gets a gradient only at the bottom edge, just enough for text legibility: `linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)` over the bottom ~40% of the frame — never a full-image tint.

## 7. Screen Templates

Every new screen must match one of these five. If a genuinely new need doesn't fit any of them, that's a signal to add a 6th template here first — not to improvise inside an existing one.

1. **Cover** (Welcome/onboarding) — full-bleed photo, centered logo + title + tagline, primary button + secondary link near the bottom. No header, no tab bar.
2. **Map/Data-entry** (e.g. "Your Farm") — photo/map banner card, then a list of icon-labeled fact rows, then one primary CTA. Header + tab bar.
3. **Dashboard** (e.g. "Farm Overview") — stacked standard cards: a summary-stat row, a chart card, one or more progress-bar cards. Header + tab bar.
4. **Recommendation list** (e.g. "Recommendations") — one featured card, a row of smaller option cards (photo + name + %), then a stepped plan list. Header + tab bar.
5. **Detail** (e.g. a single crop's page) — photo banner, title + badge, icon-labeled fact rows, one explanation/"why" box, one primary CTA. Header with back-arrow, **no** tab bar.
6. **Error/Not found** — centered one-line plain-language message ("Page introuvable"), one primary button back to the Cover screen. No header, no tab bar.

## 8. Image / Photo Guidelines

Real photography is intended throughout (field shots, crop close-ups) but not yet produced. Until real images exist:

- **Placeholder convention**: a `--green-tint` rounded rectangle at the slot's real aspect ratio, with a small centered icon + a one-line label in `--text-600` naming exactly what's missing, e.g. "Photo: champ de blé". Never leave a slot visually empty or fake it with a flat color pretending to be a photo.
- **Aspect ratios to reserve**: Cover/welcome banner — tall, ~9:16 full-bleed; Farm/map banner — ~4:3; Recommendation option thumbnail — 1:1; Detail page banner — ~16:9.
- When real photos are ready, they drop into these exact slots at these exact ratios with no layout changes.

## 9. Accessibility Baseline

- Text contrast ≥ 4.5:1 (≥ 3:1 only for text 24px and above).
- Every tappable element is a real `<button>` or `<a href>` — never a `div`/`span` with a click handler.
- Color is never the only signal — pair it with an icon, label, or position (e.g. the "Recommended" badge has text, not just a colored border).
- No content is understandable only by sound or color alone.
- **Focus ring**: every interactive element gets a visible `2px solid var(--green-900)` ring, 2px offset, on keyboard focus. Never remove the default outline without replacing it.
- **Hover** (pointer devices only, never required for usability since touch has no hover): a subtle 4% darken overlay on buttons and tappable cards.
- **Disabled**: 50% opacity + `cursor: not-allowed`, nothing else changes. This must stay visually distinct from an inactive-but-reachable tab (e.g. an unselected tab bar icon is not disabled — only a destination that genuinely doesn't exist yet, like Profile before it's built, gets disabled styling).

## 10. File & Naming Conventions (for whoever builds the real frontend)

- One file per screen, PascalCase, matching the screen's route/purpose (e.g. `FarmOverview`, `CropDetail`).
- Shared tokens (colors, spacing, radius) live in **one** stylesheet/theme file — never redefined per screen.
- Shared components (button, card, badge, tab bar, header) are built once and reused — never copy-pasted with small tweaks. If a screen seems to need a tweaked version of an existing component, that's a sign the component needs a documented variant here, not a one-off copy.

## 11. Checklist Before Adding Any New Page or Feature

1. Which of the 5 templates (§7) does this match? If none, propose the new template here first.
2. Does it only use tokens from §2–§6? If it needs a new color/component, add it to this file before building.
3. Tab bar or back-arrow header — which, per §7?
4. Any photo slots — placeholder per §8, correct aspect ratio reserved?
5. Touch targets, contrast, real interactive elements — per §9?
