/**
 * Turns tokens.ts into CSS custom properties. Used by scripts/generate-tokens-css.ts
 * (writes tokens.css) and by the test that checks tokens.css is up to date.
 * Naming: `--<group>-<name>` in kebab-case, except colors, which use design.md's names
 * as-is (--green-900, --text-600, …).
 */
import {
  aspectRatio,
  borderWidth,
  color,
  fontFamily,
  fontSize,
  fontWeight,
  gradient,
  icon,
  layout,
  padding,
  radius,
  shadow,
  size,
  space,
} from "./tokens.ts";

const px = (n: number): string => `${n}px`;
const raw = (v: string | number): string => String(v);

/** camelCase / letter-digit boundaries → kebab-case: green900 → green-900, tabBarHeight → tab-bar-height */
export const kebab = (name: string): string =>
  name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase();

type Group = Record<string | number, string | number>;

const entries = (
  group: Group,
  prefix: string,
  format: (v: never) => string,
): Array<[string, string]> =>
  Object.entries(group).map(([k, v]) => [
    `--${prefix ? `${prefix}-` : ""}${kebab(k)}`,
    (format as (v: string | number) => string)(v),
  ]);

export function cssVariableEntries(): Array<[string, string]> {
  return [
    ...entries(color, "", raw),
    ...entries(fontFamily, "font-family", raw),
    ...entries(fontSize, "font-size", px),
    ...entries(fontWeight, "font-weight", raw),
    ...entries(space, "space", px),
    ...entries(layout, "", px),
    ...entries(radius, "radius", px),
    ...entries(shadow, "shadow", raw),
    ...entries(gradient, "gradient", raw),
    ...entries(size, "", px),
    ...entries(padding, "padding", px),
    ...entries(borderWidth, "border-width", px),
    ...entries(
      { iconSizeInline: icon.sizeInline, iconSizeData: icon.sizeData },
      "",
      px,
    ),
    ...entries({ iconStrokeWidth: icon.strokeWidth }, "", raw),
    ...entries(aspectRatio, "aspect", raw),
  ];
}

export function buildTokensCss(): string {
  const lines = cssVariableEntries().map(
    ([name, value]) => `  ${name}: ${value};`,
  );
  return [
    "/*",
    " * GENERATED from src/theme/tokens.ts by `npm run tokens`. Do not edit by hand.",
    " * Source of truth: frontend/design.md.",
    " */",
    ":root {",
    ...lines,
    "}",
    "",
  ].join("\n");
}
