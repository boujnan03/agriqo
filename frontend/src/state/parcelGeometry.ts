/**
 * Geometry of the parcel drawn on Home's map: centroid, area, GeoJSON.
 *
 * Parcels are small (a few hectares), so a local equirectangular projection (metres east /
 * north, scaled at the corners' mean latitude) is accurate far below the precision of any data
 * source used. The scale depends on all corners equally, so the drawing order (which corner
 * came first, clockwise or not) never changes the area or the centroid.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

/** The drawn parcel: its corners (in drawing order, not repeated) + its centroid. */
export interface Parcel extends LatLon {
  /** Corners as drawn, at least 3, the first NOT repeated at the end. */
  polygon: LatLon[];
}

const M_PER_DEG_LAT = 111_320;

/** Metres per degree of longitude, at the corners' mean latitude. */
function mPerDegLonFor(corners: LatLon[]): number {
  const meanLat = corners.reduce((sum, c) => sum + c.lat, 0) / corners.length;
  return M_PER_DEG_LAT * Math.cos((meanLat * Math.PI) / 180);
}

/** Corners projected to metres, relative to the first corner. */
function project(corners: LatLon[]): { x: number; y: number }[] {
  const origin = corners[0];
  const mPerDegLon = mPerDegLonFor(corners);
  return corners.map((c) => ({
    x: (c.lon - origin.lon) * mPerDegLon,
    y: (c.lat - origin.lat) * M_PER_DEG_LAT,
  }));
}

/** Signed shoelace sum over the projected ring (2 × signed area, m²). */
function shoelace(points: { x: number; y: number }[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum;
}

/** Area enclosed by the corners, in m² (0 for fewer than 3 corners or collinear ones). */
export function polygonAreaM2(corners: LatLon[]): number {
  if (corners.length < 3) return 0;
  return Math.abs(shoelace(project(corners))) / 2;
}

/** Below this, the shape is a line or a dot, not a field: it can't be closed as a parcel. */
export const MIN_PARCEL_AREA_M2 = 1;

/** Enough corners, enclosing a real surface. */
export function isClosable(corners: LatLon[]): boolean {
  return corners.length >= 3 && polygonAreaM2(corners) >= MIN_PARCEL_AREA_M2;
}

/**
 * Area-weighted centroid (the polygon's centre of mass), the point sent to the point-based
 * sources. Throws on a shape that isn't closable: there is no centre to give.
 */
export function polygonCentroid(corners: LatLon[]): LatLon {
  if (!isClosable(corners)) throw new Error("not a closable polygon");
  const pts = project(corners);
  const twiceArea = shoelace(pts);
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const cross = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  cx /= 3 * twiceArea;
  cy /= 3 * twiceArea;
  const origin = corners[0];
  return {
    lat: origin.lat + cy / M_PER_DEG_LAT,
    lon: origin.lon + cx / mPerDegLonFor(corners),
  };
}

/** A parcel from its drawn corners (centroid computed here, once). */
export function parcelFromCorners(corners: LatLon[]): Parcel {
  return { ...polygonCentroid(corners), polygon: [...corners] };
}

/** GeoJSON Polygon geometry (RFC 7946): one closed ring of [lon, lat] positions. */
export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

export function toGeoJson(corners: LatLon[]): GeoJsonPolygon {
  const ring = corners.map((c): [number, number] => [c.lon, c.lat]);
  return { type: "Polygon", coordinates: [[...ring, ring[0]]] };
}
