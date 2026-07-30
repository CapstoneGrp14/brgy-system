/**
 * Barangay 591 (Zone 58, District VI, Sta. Mesa, Manila) coverage geometry —
 * single source of truth for the web maps AND the API's out-of-scope checks.
 * Official PSA administrative boundary (PSGC PH133906198, 2019 PSA/HDX
 * dataset via faeldon/philippines-json-maps) — the same polygon Google Maps
 * renders for "Barangay 591, Santa Mesa, Manila".
 */
export const BRGY_BOUNDARY: ReadonlyArray<readonly [number, number]> = [
  [14.59976, 121.015797], // NE — Old Sta. Mesa / Valenzuela corner
  [14.597408, 121.016528], // SE — PNR crossing
  [14.597366, 121.016305],
  [14.597481, 121.015627],
  [14.59947, 121.014202], // along the PNR line (NW-ward)
  [14.598535, 121.013003], // south dip (Anonas wedge)
  [14.599338, 121.01202], // SW — Teresa St
  [14.600716, 121.013317], // NW — Teresa × Old Sta. Mesa
];

export const BRGY_CENTER: readonly [number, number] = [14.59887, 121.01473];

/** [[southLat, westLng], [northLat, eastLng]] pan limits for the map. */
export const BRGY_MAX_BOUNDS: readonly [readonly [number, number], readonly [number, number]] = [
  [14.5946, 121.0092],
  [14.6035, 121.0193],
];

const M_PER_DEG_LAT = 110_574;
const M_PER_DEG_LNG = 111_320 * Math.cos((14.6 * Math.PI) / 180);

/** Ray-casting point-in-polygon (lat = y, lng = x). */
function insidePolygon(lat: number, lng: number): boolean {
  let inside = false;
  for (let i = 0, j = BRGY_BOUNDARY.length - 1; i < BRGY_BOUNDARY.length; j = i++) {
    const [latI, lngI] = BRGY_BOUNDARY[i];
    const [latJ, lngJ] = BRGY_BOUNDARY[j];
    const crosses =
      latI > lat !== latJ > lat &&
      lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Distance in meters from a point to the nearest boundary segment. */
function metersToBoundary(lat: number, lng: number): number {
  let best = Infinity;
  for (let i = 0, j = BRGY_BOUNDARY.length - 1; i < BRGY_BOUNDARY.length; j = i++) {
    const [latA, lngA] = BRGY_BOUNDARY[j];
    const [latB, lngB] = BRGY_BOUNDARY[i];
    // Project into a local meters plane.
    const ax = (lngA - lng) * M_PER_DEG_LNG;
    const ay = (latA - lat) * M_PER_DEG_LAT;
    const bx = (lngB - lng) * M_PER_DEG_LNG;
    const by = (latB - lat) * M_PER_DEG_LAT;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
    const px = ax + t * dx;
    const py = ay + t * dy;
    best = Math.min(best, Math.hypot(px, py));
  }
  return best;
}

/**
 * True when the point is inside Barangay 591, with a buffer (default 70 m)
 * so ordinary urban GPS drift near the boundary is not rejected.
 */
export function isWithinBarangay(lat: number, lng: number, bufferMeters = 70): boolean {
  if (insidePolygon(lat, lng)) return true;
  return metersToBoundary(lat, lng) <= bufferMeters;
}
