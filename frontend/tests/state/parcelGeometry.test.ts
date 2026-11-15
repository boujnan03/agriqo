import { describe, expect, it } from "vitest";

import {
  isClosable,
  parcelFromCorners,
  polygonAreaM2,
  polygonCentroid,
  toGeoJson,
} from "../../src/state/parcelGeometry";
import { TADLA, TADLA_CORNERS } from "../utils";

/** Metres → degrees near 32.4° N. */
const dLat = (m: number) => m / 111_320;
const dLon = (m: number) => m / (111_320 * Math.cos((32.4 * Math.PI) / 180));

describe("parcel geometry", () => {
  it("a 100 m × 100 m square: area 1 ha, centroid at its middle", () => {
    const square = [
      { lat: 32.4, lon: -6.45 },
      { lat: 32.4, lon: -6.45 + dLon(100) },
      { lat: 32.4 + dLat(100), lon: -6.45 + dLon(100) },
      { lat: 32.4 + dLat(100), lon: -6.45 },
    ];
    expect(polygonAreaM2(square)).toBeCloseTo(10_000, -1); // within ±5 m²
    const c = polygonCentroid(square);
    expect(c.lat).toBeCloseTo(32.4 + dLat(50), 7);
    expect(c.lon).toBeCloseTo(-6.45 + dLon(50), 7);
  });

  it("winding direction doesn't matter", () => {
    const reversed = [...TADLA_CORNERS].reverse();
    expect(polygonAreaM2(reversed)).toBeCloseTo(
      polygonAreaM2(TADLA_CORNERS),
      6,
    );
    expect(polygonCentroid(reversed).lat).toBeCloseTo(TADLA.lat, 9);
  });

  it("is area-weighted: an L-shaped parcel's centroid is NOT the mean of its corners", () => {
    // An L: a 200 × 100 m bar along the south edge + a 100 × 100 m block on its west end.
    const L = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 200 },
      { lat: 100, lon: 200 },
      { lat: 100, lon: 100 },
      { lat: 200, lon: 100 },
      { lat: 200, lon: 0 },
    ].map((p) => ({ lat: 32.4 + dLat(p.lat), lon: -6.45 + dLon(p.lon) }));
    // Exact centre of mass: x = (2·100 + 1·50) / 3 = 83.3 m, y = (2·50 + 1·150) / 3 = 83.3 m.
    const c = polygonCentroid(L);
    expect(c.lat).toBeCloseTo(32.4 + dLat(250 / 3), 6);
    expect(c.lon).toBeCloseTo(-6.45 + dLon(250 / 3), 6);
    const meanLat = L.reduce((s, p) => s + p.lat, 0) / L.length;
    expect(Math.abs(c.lat - meanLat)).toBeGreaterThan(dLat(10));
  });

  it("fewer than 3 corners, or corners on one line, can't be closed", () => {
    expect(isClosable(TADLA_CORNERS.slice(0, 2))).toBe(false);
    const line = [0, 50, 100].map((m) => ({ lat: 32.4, lon: -6.45 + dLon(m) }));
    expect(polygonAreaM2(line)).toBeLessThan(1);
    expect(isClosable(line)).toBe(false);
    expect(() => polygonCentroid(line)).toThrow();
    expect(isClosable(TADLA_CORNERS)).toBe(true);
  });

  it("GeoJSON: one closed ring of [lon, lat] (longitude first)", () => {
    const g = toGeoJson(TADLA_CORNERS);
    expect(g.type).toBe("Polygon");
    expect(g.coordinates).toHaveLength(1);
    const ring = g.coordinates[0];
    expect(ring).toHaveLength(TADLA_CORNERS.length + 1);
    expect(ring[0]).toEqual([-6.4505, 32.3995]);
    expect(ring.at(-1)).toEqual(ring[0]);
  });

  it("parcelFromCorners keeps the corners and adds the centroid", () => {
    const p = parcelFromCorners(TADLA_CORNERS);
    expect(p.polygon).toEqual(TADLA_CORNERS);
    expect(p.lat).toBeCloseTo(32.4, 9);
    expect(p.lon).toBeCloseTo(-6.45, 9);
  });
});
