import { readFileSync } from "node:fs";
import { join } from "node:path";

import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import logoFull from "../../src/assets/logo/logo-full.png";
import logoMark from "../../src/assets/logo/logo-mark.png";
import i18n, { LANGUAGES } from "../../src/i18n";
import { inLanguage, renderRoute } from "../utils";

/** Every screen with an image slot, and how many illustrations it shows. */
const IMAGE_SCREENS = [
  { path: "/", images: 1 }, // cover
  { path: "/home", images: 1 }, // map/picker banner
  { path: "/recommendations", images: 3 }, // featured + 2 options
  { path: "/crop/ble", images: 1 },
  { path: "/crop/orge", images: 1 },
  { path: "/crop/legumineuses", images: 1 },
];

/** Illustration URLs on screen (the Header mark and Cover logo are not illustrations). */
const illustrationSrcs = (root: HTMLElement) =>
  [...root.querySelectorAll("img")]
    .map((img) => img.getAttribute("src") ?? "")
    .filter((src) => src !== logoMark && src !== logoFull);

describe("illustrations replace every PhotoFrame placeholder (identical in all languages)", () => {
  it.each(IMAGE_SCREENS)("$path", async ({ path, images }) => {
    const perLanguage: string[][] = [];
    for (const lng of LANGUAGES) {
      await i18n.changeLanguage(lng);
      const { container, unmount } = renderRoute(path);
      const srcs = illustrationSrcs(container);
      expect(srcs, lng).toHaveLength(images);
      // No labelled placeholder box left (PhotoFrame's fallback is a div[role=img]).
      expect(container.querySelectorAll('div[role="img"]'), lng).toHaveLength(
        0,
      );
      perLanguage.push(srcs);
      unmount();
    }
    expect(perLanguage[1]).toEqual(perLanguage[0]);
    expect(perLanguage[2]).toEqual(perLanguage[0]);
  });
});

describe("Header logo", () => {
  inLanguage("fr");

  it.each(["/home", "/farm", "/overview", "/weather", "/profile"])(
    "section-root header %s starts with the AGRIQO mark",
    (path) => {
      renderRoute(path);
      const header = screen.getByRole("banner");
      const mark = header.querySelector("img");
      expect(mark).toHaveAttribute("src", logoMark);
      expect(mark).toHaveAttribute("alt", ""); // decorative: the h1 names the screen
      expect(header.firstElementChild).toBe(mark);
    },
  );

  it("drill-in headers keep the back arrow in that start slot instead", () => {
    renderRoute("/crop/ble");
    const header = screen.getByRole("banner");
    expect(header.querySelector("img")).toBeNull();
    expect(header.firstElementChild).toBe(
      within(header).getAllByRole("link")[0],
    );
  });
});

describe("favicon and PWA icons are the real AGRIQO assets", () => {
  const ROOT = process.cwd();
  const PUBLIC = join(ROOT, "public");
  const html = readFileSync(join(ROOT, "index.html"), "utf8");
  const manifest = JSON.parse(
    readFileSync(join(PUBLIC, "manifest.webmanifest"), "utf8"),
  ) as { icons: { src: string; sizes: string; purpose: string }[] };

  /** Width × height from a PNG header. */
  const pngSize = (file: string) => {
    const b = readFileSync(join(PUBLIC, file));
    expect(b.subarray(1, 4).toString("latin1")).toBe("PNG");
    return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
  };

  it("index.html links every icon file and the manifest, and they exist", () => {
    expect(html).not.toContain('href="data:,"'); // the old empty favicon
    const hrefs = [...html.matchAll(/<link[^>]+href="\/([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(hrefs).toEqual([
      "favicon.ico",
      "favicon-32x32.png",
      "favicon-16x16.png",
      "apple-touch-icon.png",
      "manifest.webmanifest",
    ]);
    expect(pngSize("favicon-16x16.png")).toBe("16x16");
    expect(pngSize("favicon-32x32.png")).toBe("32x32");
    expect(pngSize("apple-touch-icon.png")).toBe("180x180");
    // .ico header: reserved 0, type 1 (icon), at least one image.
    const ico = readFileSync(join(PUBLIC, "favicon.ico"));
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);
    expect(ico.readUInt16LE(4)).toBeGreaterThan(0);
  });

  it("manifest icons exist with the sizes they declare, incl. a maskable one", () => {
    for (const icon of manifest.icons) {
      expect(pngSize(icon.src.replace(/^\//, ""))).toBe(icon.sizes);
    }
    expect(manifest.icons.map((i) => i.purpose)).toContain("maskable");
  });
});
