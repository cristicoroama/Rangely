/**
 * Web Mercator, the small part of it a route needs.
 *
 * There is no map library here on purpose. Everything a static ride map does —
 * pick a zoom that fits the track, work out which tiles cover the view, put
 * each latitude and longitude at a pixel — is four formulas that have not
 * changed since 2005, and they are worth more as fifty testable lines than as
 * a dependency with a native build, an API key and a licence.
 *
 * Pure, like ride.js: no React, no fetch, no device.
 */
export const TILE = 256;

/** Longitude to tile-space X at this zoom (1 unit = 1 tile). */
export const lonToX = (lon, z) => ((lon + 180) / 360) * 2 ** z;

/** Latitude to tile-space Y. The log-tangent is the Mercator projection: the
 *  reason Greenland looks like Africa, and the reason every tile server on
 *  earth agrees on which square is which. */
export const latToY = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

/** The box a track lives in. Null for a track too short to draw. */
export function trackBounds(track) {
  const pts = (track || []).filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );
  if (pts.length < 2) return null;

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [lat, lon] of pts) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

/**
 * Choose a zoom and an origin so the whole ride fits the box, and hand back
 * the projection that puts a fix on a pixel.
 *
 * Zoom is searched from the closest outwards and stops at the first one that
 * fits, because the closest fit is the one that shows the most of the ride —
 * a ride around one block should not be drawn as a dot on a map of the county.
 */
export function fitView(track, width, height, opts = {}) {
  const { padding = 14, maxZoom = 17, minZoom = 1 } = opts;
  const b = trackBounds(track);
  if (!b || !(width > 0) || !(height > 0)) return null;

  const usableW = Math.max(1, width - padding * 2);
  const usableH = Math.max(1, height - padding * 2);

  let zoom = minZoom;
  for (let z = maxZoom; z >= minZoom; z--) {
    const w = (lonToX(b.maxLon, z) - lonToX(b.minLon, z)) * TILE;
    // Y grows downwards, so the northern edge is the smaller number.
    const h = (latToY(b.minLat, z) - latToY(b.maxLat, z)) * TILE;
    if (w <= usableW && h <= usableH) {
      zoom = z;
      break;
    }
  }

  const cx = ((lonToX(b.minLon, zoom) + lonToX(b.maxLon, zoom)) / 2) * TILE;
  const cy = ((latToY(b.minLat, zoom) + latToY(b.maxLat, zoom)) / 2) * TILE;
  const originX = cx - width / 2;
  const originY = cy - height / 2;

  const project = (lat, lon) => [
    lonToX(lon, zoom) * TILE - originX,
    latToY(lat, zoom) * TILE - originY,
  ];

  return { zoom, originX, originY, width, height, project };
}

/**
 * The tiles covering a view, with the pixel position each one goes at.
 *
 * Capped: a view that somehow asks for hundreds of tiles is a bug, and a bug
 * that fires off hundreds of requests to a free tile server is a bug that gets
 * an IP banned.
 */
export function tilesFor(view, { max = 30 } = {}) {
  if (!view) return [];
  const { zoom, originX, originY, width, height } = view;
  const span = 2 ** zoom;

  const x0 = Math.floor(originX / TILE);
  const x1 = Math.floor((originX + width) / TILE);
  const y0 = Math.floor(originY / TILE);
  const y1 = Math.floor((originY + height) / TILE);

  const out = [];
  for (let y = y0; y <= y1; y++) {
    // Above the north pole or below the south one there is no tile, only the
    // background.
    if (y < 0 || y >= span) continue;
    for (let x = x0; x <= x1; x++) {
      // Longitude wraps; the tile at 181° east is the one at 179° west.
      const wrapped = ((x % span) + span) % span;
      out.push({
        key: `${zoom}/${wrapped}/${y}`,
        z: zoom,
        x: wrapped,
        y,
        left: x * TILE - originX,
        top: y * TILE - originY,
      });
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Every fix as an "x,y" pair, ready for an SVG polyline. */
export function projectTrack(track, view) {
  if (!view) return "";
  return (track || [])
    .filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map(([lat, lon]) => {
      const [x, y] = view.project(lat, lon);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
