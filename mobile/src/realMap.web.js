import { RouteShape } from "./routeShape";

/**
 * The web build has no native map, and wiring Google's JS SDK in for a
 * browser preview nobody rides with would be a second map to maintain. Metro
 * picks this file on web and the drawn outline stands in — same route, same
 * colours, no pan and no streets.
 */
export function RealMap({ track, height = 320, style }) {
  return <RouteShape track={track} height={height} thick={3.5} style={style} />;
}
