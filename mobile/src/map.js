/**
 * Two ways to show a ride, and the rule for which to use.
 *
 *   RouteShape — the outline alone: pure SVG, no network, no key, no cost.
 *                Belongs in lists and thumbnails.
 *   RouteMap   — Leaflet over OpenStreetMap in a WebView: pan, zoom, street
 *                names, a following dot. Heavy, so it belongs on one ride at a
 *                time, and on the live screen while riding.
 *   RangeMap   — the same map as a still picture, with the "there and back"
 *                circle round where you are.
 *
 * Keeping them behind one module means a screen asks for what it needs rather
 * than for an implementation, and swapping the heavy one out — for Google, for
 * MapLibre, for whatever comes next — touches one file.
 */
export { RouteShape, RouteLine } from "./routeShape";
export { RealMap as RouteMap, RangeMap } from "./realMap";
