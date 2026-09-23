/**
 * Google's map, dressed for this app.
 *
 * The default map is a white page, and dropping one into a dark screen is the
 * single fastest way to make an app look assembled from parts. This is the
 * same map with its own palette: the app's background under the land, its
 * borders on the roads, its dim grey for labels — so the route drawn on top
 * is the brightest thing in the frame, which is the whole point.
 */
export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#11141a" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8d95a5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0b0e" }] },

  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#2a313d" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },

  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#16241c" }, { visibility: "on" }] },

  { featureType: "road", elementType: "geometry", stylers: [{ color: "#242a34" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#2b323d" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#39414f" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1b1f27" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },

  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1826" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3f4a5c" }] },
];
