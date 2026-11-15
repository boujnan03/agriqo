import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { fontFamily, gradient } from "../../src/theme/tokens";

const SRC = join(process.cwd(), "src");
const read = (path: string) =>
  readFileSync(path, "utf8").replace(/\r\n/g, "\n");

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const offenders = (ext: RegExp, pattern: RegExp) =>
  filesUnder(SRC)
    .filter((f) => ext.test(f))
    .flatMap((file) =>
      [...read(file).matchAll(pattern)].map(
        (m) => `${relative(process.cwd(), file)}: "${m[0].trim()}"`,
      ),
    );

describe("RTL readiness (design.md §9a)", () => {
  it("stylesheets use logical properties, never physical left/right", () => {
    const PHYSICAL =
      /(^|[\s;{])((margin|padding|border|inset)-(left|right)|left|right)\s*:|text-align\s*:\s*(left|right)|float\s*:\s*(left|right)/gm;
    expect(offenders(/\.css$/, PHYSICAL)).toEqual([]);
  });

  it("inline styles in components use logical properties, never left/right", () => {
    const INLINE_PHYSICAL =
      /\b(left|right|(margin|padding)(Left|Right))\s*:\s*[`'"\w{]/g;
    expect(offenders(/\.tsx$/, INLINE_PHYSICAL)).toEqual([]);
  });

  it("has no per-component RTL overrides: flipping <html dir> does all the mirroring", () => {
    expect(offenders(/\.css$/, /\[dir|:dir\(/g)).toEqual([]);
  });

  it("the PhotoFrame text gradient is vertical, so it never flips with dir", () => {
    expect(gradient.photoBottom).toMatch(/^linear-gradient\(to top,/);
    expect(gradient.photoBottom).not.toMatch(/left|right|deg/);
  });

  it("Arabic gets its own font, switched on only by <html lang=ar>", () => {
    expect(fontFamily.arabic).toMatch(/^'Noto Sans Arabic'/);
    expect(fontFamily.base).not.toMatch(/Arabic/);
    expect(read(join(SRC, "theme", "global.css"))).toMatch(
      /:root:lang\(ar\)\s*\{\s*--font-family-base:\s*var\(--font-family-arabic\);/,
    );
    expect(read(join(SRC, "main.tsx"))).toMatch(
      /@fontsource\/noto-sans-arabic\/arabic-400\.css/,
    );
  });
});
