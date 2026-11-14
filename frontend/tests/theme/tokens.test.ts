import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildTokensCss,
  cssVariableEntries,
} from "../../src/theme/cssVariables";
import { color } from "../../src/theme/tokens";

const SRC = join(process.cwd(), "src");
const THEME = join(SRC, "theme");
const read = (path: string) =>
  readFileSync(path, "utf8").replace(/\r\n/g, "\n");

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

describe("design tokens (design.md §2–§6)", () => {
  it("tokens.css is up to date with tokens.ts (run `npm run tokens` if this fails)", () => {
    expect(read(join(THEME, "tokens.css"))).toBe(buildTokensCss());
  });

  it("keeps design.md's exact color names and values", () => {
    const css = Object.fromEntries(cssVariableEntries());
    expect(css["--green-900"]).toBe("#1E5631");
    expect(css["--green-tint"]).toBe("#E3F3DE");
    expect(css["--tab-inactive"]).toBe(color.tabInactive);
  });

  it("every var(--x) used in a stylesheet is defined in tokens.css", () => {
    const defined = new Set(cssVariableEntries().map(([name]) => name));
    const used = filesUnder(SRC)
      .filter((f) => f.endsWith(".css"))
      .flatMap((f) =>
        [...read(f).matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]),
      );
    const missing = [...new Set(used)].filter((name) => !defined.has(name));
    expect(missing).toEqual([]);
  });
});

describe("no raw design values outside src/theme (design.md §10)", () => {
  const RAW_VALUE = [
    { kind: "hex color", pattern: /#[0-9a-fA-F]{3,8}\b/g },
    { kind: "px value", pattern: /\b\d+(\.\d+)?px\b/g },
    { kind: "rgb/hsl color", pattern: /\b(rgba?|hsla?)\(/g },
  ];

  it("finds no hex colors, px values or rgb()/hsl() colors in components, pages, etc.", () => {
    const offenders = filesUnder(SRC)
      .filter((f) => !f.startsWith(THEME + sep) && /\.(tsx?|css)$/.test(f))
      .flatMap((file) =>
        RAW_VALUE.flatMap(({ kind, pattern }) =>
          [...read(file).matchAll(pattern)].map(
            (m) => `${relative(process.cwd(), file)}: ${kind} "${m[0]}"`,
          ),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
