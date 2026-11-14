/**
 * Field Shift design tokens: the ONLY place design values live in code.
 *
 * Source of truth: frontend/design.md (§2 colors, §3 typography, §4 spacing/radius/shadow,
 * §5 icon sizes, §6 component dimensions, §8 photo aspect ratios). Each value cites its section.
 * Change design.md first, then this file, then run `npm run tokens` to regenerate tokens.css
 * (a test fails if tokens.css and this file drift apart).
 *
 * Ranges: design.md often gives a range ("18–22px"). The range is written here exactly as in
 * design.md, and `fromRange` picks the value components use: the LOWER bound (team decision,
 * 2026-11-14). To change that policy, change `fromRange` only.
 *
 * Imports inside src/theme use explicit `.ts` extensions so that Node can run the
 * tokens.css generator (scripts/generate-tokens-css.ts) without a build step.
 */

type Range = readonly [min: number, max: number];

/** design.md range → the single value used in the UI (lower bound). */
export const fromRange = (range: Range): number => range[0];

/** §2 Color Tokens. CSS names match design.md exactly (green900 → --green-900). */
export const color = {
  green900: "#1E5631", // primary buttons, logo, active tab, key headings
  green700: "#4C9A4C", // secondary green accents
  greenTint: "#E3F3DE", // featured cards, badge pills, "why" boxes, photo placeholders (§8)
  white: "#FFFFFF", // card surfaces, base background
  text900: "#1A1A1A", // primary headings and body text
  text600: "#6B7280", // secondary/muted text
  border: "#E5E7EB", // card borders, dividers, progress tracks
  tabInactive: "#9CA3AF", // inactive bottom-tab icon + label
  iconWater: "#3B82F6", // water/irrigation data icons ONLY
  iconSoil: "#92653F", // soil-type data icons ONLY
  iconPlant: "#2E6B47", // crop/plant data icons ONLY
} as const;

/** §3 Typography. */
export const fontFamily = {
  // §3: headings "Inter or Poppins", body/buttons/captions Inter → Inter everywhere.
  // Fallbacks (system-ui, sans-serif) are not in design.md: generic safety net only.
  base: "'Inter', system-ui, sans-serif",
} as const;

export const fontSize = {
  screenTitle: fromRange([18, 22]), // §3 "Screen titles 18–22px"
  heroTitle: fromRange([26, 32]), // §3 "hero titles 26–32px"
  body: fromRange([14, 16]), // §3 "Body … 14–16px"
  label: fromRange([15, 16]), // §3 "Buttons/labels … 15–16px"
  caption: fromRange([11, 13]), // §3 "Captions/muted … 11–13px" (decorative-only below 13px)
  badge: 12, // §6 Badge "12px"
} as const;

export const fontWeight = {
  heading: fromRange([700, 800]), // §3 "weight 700–800"
  body: fromRange([400, 500]), // §3 "weight 400–500"
  label: 600, // §3 "Buttons/labels: … weight 600"
  caption: 500, // §3 "Captions/muted: … weight 500"
  bold: 700, // §6 "bold" (badge text, active tab label); CSS `bold` = 700
} as const;

/** §4 Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32px. Key = px value. */
export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
} as const;

export const layout = {
  screenPadding: 20, // §4 "Screen edge padding = 20px"
  cardGap: fromRange([12, 16]), // §4 "Gap between stacked cards = 12–16px"
  touchTarget: 44, // §4 "every tappable element ≥ 44×44px"
} as const;

/** §4 Radius (+ §6 progress bar). */
export const radius = {
  button: 16, // §4 "16px on buttons and small chips"
  chip: 16, // §4
  card: 20, // §4 "20px on cards and photo frames"
  photo: 20, // §4 (§6 says "16–20px"; §4's exact 20px is used, within that range)
  pill: 999, // §4 "999px (full) on badge pills"
  bar: 4, // §6 Progress bar "radius 4px"
} as const;

/** §4 Shadow: one soft shadow, standard cards only. */
export const shadow = {
  card: "0 4px 12px rgba(0,0,0,0.06)",
} as const;

/**
 * §6 Photo frame: bottom-only gradient for text-bearing photos (Cover, Detail banner with a
 * badge), just enough for text legibility; never a full-image tint. Value verbatim from §6.
 */
export const gradient = {
  photoBottom:
    "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 45%)",
} as const;

/** §6 component dimensions. */
export const size = {
  buttonHeight: fromRange([52, 56]), // §6 Primary button "height 52–56px"
  tabBarHeight: fromRange([64, 72]), // §6 Tab bar "~64–72px tall"
  headerHeight: fromRange([56, 60]), // §6 Header "56–60px tall"
  progressHeight: 8, // §6 Progress bar "8px height"
} as const;

export const padding = {
  card: fromRange([16, 20]), // §6 Standard card "16–20px padding"
  cardFeatured: 20, // §6 Featured card "20px padding"
  badgeY: fromRange([4, 6]), // §6 Badge "4–6px / 10–12px padding"
  badgeX: fromRange([10, 12]), // §6
} as const;

export const borderWidth = {
  hairline: 1, // §6 card border "1px", tab bar "1px top border"
  outline: 1.5, // §6 Outline button "1.5px … border"
} as const;

/** §5 Iconography. */
export const icon = {
  sizeInline: fromRange([18, 20]), // §5 "18–20px inside buttons and tab bar"
  sizeData: fromRange([22, 24]), // §5 "22–24px inside data-row circles"
  strokeWidth: 1.8, // §5 "1.8px stroke, rounded caps/joins"
} as const;

/** §8 Aspect ratios to reserve for photo slots. */
export const aspectRatio = {
  cover: "9 / 16", // §8 "Cover/welcome banner — tall, ~9:16 full-bleed"
  farm: "4 / 3", // §8 "Farm/map banner — ~4:3"
  thumbnail: "1 / 1", // §8 "Recommendation option thumbnail — 1:1"
  detail: "16 / 9", // §8 "Detail page banner — ~16:9"
} as const;

export type PhotoSlot = keyof typeof aspectRatio;

export const tokens = {
  color,
  fontFamily,
  fontSize,
  fontWeight,
  space,
  layout,
  radius,
  shadow,
  gradient,
  size,
  padding,
  borderWidth,
  icon,
  aspectRatio,
} as const;
