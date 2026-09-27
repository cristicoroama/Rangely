import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { F, useTheme } from "./theme";

/**
 * The real map: Leaflet in a WebView, over OpenStreetMap data.
 *
 * Pan, pinch, zoom, street names, the route drawn on top and your own dot
 * moving along it while you ride — the same map any other app gives you, with
 * two things deliberately missing: an API key, and a billing account. Google's
 * mobile maps stopped being unconditionally free in March 2025; they are a
 * metered SKU now, with a monthly free allowance, and a personal ride tracker
 * should not need a card on file to draw a line on a street.
 *
 * This is the heavy component. It opens one ride at a time, and rides along on
 * the live screen; the list keeps the drawn outline from `routeShape.js`,
 * because twenty WebViews in a scroll view is how a feed dies.
 *
 * Swapping this for Google later changes this file and nothing else — every
 * screen asks for `RouteMap`, never for an implementation.
 */

/**
 * OpenStreetMap's own tiles: no key, no account, no watermark — attribution is
 * the whole of the licence, and it sits in the corner.
 *
 * They are drawn for a white page, which is right for the light theme as they
 * come. In the dark theme the tile layer is inverted and hue-rotated back in
 * CSS (see the stylesheet below) — a filter rather than a ready-made dark
 * basemap on purpose: the dark ones are all somebody's product, and they want
 * an account, a key, or a stamp across your map.
 */
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = "&copy; OpenStreetMap contributors";
const LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist";

/** OpenStreetMap's tile policy asks every app to say who it is. The WebView
 *  appends this to its own user agent, and the page's base URL gives the
 *  tiles a referer. */
const APP_UA = "Rangely/0.3 (+https://github.com/cristicoroama/Rangely)";

/** "#36D17F" → "rgba(54,209,127,a)", for the halo round the live dot. */
function rgba(hex, a) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * The page is a shell, built once per theme and never otherwise rebuilt: the
 * track arrives later through `injectJavaScript`. Rebuilding the HTML on every
 * GPS fix would reload the entire map — tiles, zoom, the lot — once a second.
 */
function shell(t) {
  const dark = t.scheme === "dark";
  // Light tiles turned dark: invert flips the page, hue-rotate puts the
  // colours back where they belong (green parks stay green, water stays
  // blue), and the rest takes the glare off. Applied to the tile pane alone,
  // so the route and the markers keep their own colours.
  const tileFilter = dark
    ? "filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.86) saturate(0.6);"
    : "filter: saturate(0.85);";
  const chrome = dark
    ? { attrBg: "rgba(10,12,14,0.72)", attrInk: "#7F8893", attrLink: "#B1B8C1", btnBg: "#1B1F25", btnInk: "#F2F4F6", btnLine: "#343B45" }
    : { attrBg: "rgba(255,255,255,0.8)", attrInk: "#6C747E", attrLink: "#434B54", btnBg: "#FFFFFF", btnInk: "#0C0F12", btnLine: "#DCE0D9" };

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${LEAFLET}/leaflet.css" />
<style>
  html, body, #map { margin: 0; height: 100%; width: 100%; background: ${t.surface2}; }
  .leaflet-container { background: ${t.surface2}; outline: none; }
  .leaflet-tile-pane { ${tileFilter} }
  .leaflet-control-attribution {
    background: ${chrome.attrBg} !important; color: ${chrome.attrInk} !important;
    font-size: 9px !important;
  }
  .leaflet-control-attribution a { color: ${chrome.attrLink} !important; }
  .leaflet-bar { border: none !important; box-shadow: 0 2px 10px rgba(0,0,0,0.18) !important; border-radius: 12px !important; overflow: hidden; }
  .leaflet-bar a {
    background: ${chrome.btnBg} !important; color: ${chrome.btnInk} !important;
    border-color: ${chrome.btnLine} !important; width: 36px !important; height: 36px !important;
    line-height: 36px !important; font-size: 20px !important;
  }
  .dot { border-radius: 50%; border: 3px solid ${t.surface}; box-sizing: border-box; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
  .dot-start { background: ${t.accentFill}; }
  .dot-end { background: ${t.grad[1]}; }
  .dot-live { background: ${t.accentFill}; animation: halo 1.8s ease-out infinite; }
  @keyframes halo {
    0% { box-shadow: 0 0 0 0 ${rgba(t.accentFill, 0.5)}; }
    100% { box-shadow: 0 0 0 14px ${rgba(t.accentFill, 0)}; }
  }
  @media (prefers-reduced-motion: reduce) { .dot-live { animation: none; box-shadow: 0 0 0 6px ${rgba(t.accentFill, 0.25)}; } }
</style>
<script src="${LEAFLET}/leaflet.js"></script>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  map.setView([44.43, 26.10], 12);
  L.tileLayer('${TILES}', { maxZoom: 19, attribution: '${ATTRIBUTION}' }).addTo(map);

  var casing = null, line = null, startMark = null, endMark = null, liveMark = null, framed = false;

  function pin(cls, size) {
    return L.divIcon({
      className: '',
      html: '<div class="dot ' + cls + '" style="width:' + size + 'px;height:' + size + 'px"></div>',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  // Called from the app. Whole track in, redrawn out — simpler than diffing,
  // and a thinned track is a few hundred points at most.
  window.setTrack = function (pts, live) {
    if (!pts || pts.length === 0) return;

    if (line) { casing.setLatLngs(pts); line.setLatLngs(pts); }
    else {
      // A pale casing under the line, so the route stands off the streets
      // beneath it in either theme.
      casing = L.polyline(pts, {
        color: '${t.surface}', weight: 9, opacity: 0.9, lineJoin: 'round', lineCap: 'round'
      }).addTo(map);
      line = L.polyline(pts, {
        color: '${t.accentFill}', weight: 5, opacity: 1, lineJoin: 'round', lineCap: 'round'
      }).addTo(map);
    }

    if (!startMark) startMark = L.marker(pts[0], { icon: pin('dot-start', 14) }).addTo(map);

    var last = pts[pts.length - 1];
    if (live) {
      if (liveMark) liveMark.setLatLng(last);
      else liveMark = L.marker(last, { icon: pin('dot-live', 18) }).addTo(map);
      // Follow, but do not fight: the pan is animated and the zoom stays
      // wherever the rider last put it.
      if (!framed) { map.setView(last, 17); framed = true; }
      else map.panTo(last, { animate: true, duration: 0.6 });
    } else {
      if (endMark) endMark.setLatLng(last);
      else if (pts.length > 1) endMark = L.marker(last, { icon: pin('dot-end', 14) }).addTo(map);
      // A finished ride is framed once, and then it is yours to move around.
      if (!framed && pts.length > 1) {
        map.fitBounds(line.getBounds(), { padding: [28, 28] });
        framed = true;
      }
    }
  };

  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
</script>
</body>
</html>`;
}

const toPairs = (track) =>
  (track || []).filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );

export function RealMap({ track, height = 320, live = false, style }) {
  const t = useTheme();
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Built once per theme. The shell never otherwise changes; only what is
  // drawn on it does. A theme switch reloads the page, so readiness resets
  // and the track is pushed again when the new page says so.
  const html = useMemo(() => shell(t), [t]);
  useEffect(() => setReady(false), [html]);

  const pairs = toPairs(track);
  // The track gains a point every ten metres, so its length is the cheapest
  // honest signal that there is something new to draw.
  const count = pairs.length;
  const latest = useRef(pairs);
  latest.current = pairs;

  const push = useCallback(() => {
    if (!ref.current || !ready || !latest.current.length) return;
    ref.current.injectJavaScript(
      `window.setTrack(${JSON.stringify(latest.current)}, ${live ? "true" : "false"}); true;`,
    );
  }, [ready, count, live]);

  useEffect(push, [push]);

  return (
    <View
      style={[
        s.box,
        { height, backgroundColor: t.surface2, borderRadius: t.radius },
        style,
      ]}
    >
      <WebView
        key={t.scheme}
        ref={ref}
        source={{ html, baseUrl: "https://rangely.app/" }}
        originWhitelist={["*"]}
        applicationNameForUserAgent={APP_UA}
        onMessage={(e) => {
          if (e.nativeEvent.data === "ready") {
            setFailed(false);
            setReady(true);
          }
        }}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        javaScriptEnabled
        domStorageEnabled
        // The map handles its own gestures; letting the WebView scroll too
        // makes a pinch fight the page underneath it.
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        androidLayerType="hardware"
        style={[s.web, { backgroundColor: t.surface2 }]}
      />
      {failed && (
        <View style={[s.note, { backgroundColor: t.surface, borderColor: t.line }]} pointerEvents="none">
          <Text style={[s.noteText, { color: t.text2 }]}>
            The map needs internet. Your ride is still being recorded.
          </Text>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------ range map -- */

/**
 * "There and back" on a real map: where you are, a filled circle for how far
 * out you can go and still ride home, and a dashed ring for how far the
 * battery goes if you are not coming back.
 *
 * It sits in a scrolling page, so it is a picture rather than a map you can
 * drag — a map that grabs the scroll gesture is a page you cannot scroll. The
 * circle is framed once, with a little of the dashed ring showing past it.
 */
function rangeShell(t) {
  const dark = t.scheme === "dark";
  const tileFilter = dark
    ? "filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.86) saturate(0.6);"
    : "filter: saturate(0.85);";
  const attr = dark ? { bg: "rgba(10,12,14,0.72)", ink: "#7F8893" } : { bg: "rgba(255,255,255,0.8)", ink: "#6C747E" };
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="${LEAFLET}/leaflet.css" />
<style>
  html, body, #map { margin: 0; height: 100%; width: 100%; background: ${t.surface2}; }
  .leaflet-container { background: ${t.surface2}; outline: none; }
  .leaflet-tile-pane { ${tileFilter} }
  .leaflet-control-attribution { background: ${attr.bg} !important; color: ${attr.ink} !important; font-size: 9px !important; }
  .leaflet-control-attribution a { color: ${attr.ink} !important; }
  .you { width: 18px; height: 18px; border-radius: 50%; background: ${t.accentFill}; border: 3px solid #fff; box-sizing: border-box; box-shadow: 0 0 0 6px ${rgba(t.accentFill, 0.28)}, 0 1px 4px rgba(0,0,0,0.3); }
</style>
<script src="${LEAFLET}/leaflet.js"></script>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', {
    zoomControl: false, attributionControl: true, dragging: false, touchZoom: false,
    scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false
  });
  map.setView([44.43, 26.10], 11);
  L.tileLayer('${TILES}', { maxZoom: 19, attribution: '${ATTRIBUTION}' }).addTo(map);
  var inner = null, outer = null, you = null;

  window.setRange = function (lat, lon, r, r2) {
    var c = [lat, lon];
    if (!inner) {
      outer = L.circle(c, { radius: r2, color: '${t.grad[1]}', weight: 2, opacity: 0.9, dashArray: '6 7', fill: false }).addTo(map);
      inner = L.circle(c, { radius: r, color: '${t.accentFill}', weight: 3, opacity: 1, fillColor: '${t.accentFill}', fillOpacity: ${dark ? 0.16 : 0.14} }).addTo(map);
      you = L.marker(c, { icon: L.divIcon({ className: '', html: '<div class="you"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map);
    } else {
      inner.setLatLng(c); inner.setRadius(r);
      outer.setLatLng(c); outer.setRadius(r2);
      you.setLatLng(c);
    }
    // Framed on the filled circle with room round it, so the edge of the
    // dashed one shows as a hint of "further, but no way back".
    map.fitBounds(inner.getBounds().pad(0.28), { animate: false });
  };

  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('ready');
</script>
</body>
</html>`;
}

export function RangeMap({ center, radiusM, outerM, height = 200, style }) {
  const t = useTheme();
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const html = useMemo(() => rangeShell(t), [t]);
  useEffect(() => setReady(false), [html]);

  const lat = center?.lat;
  const lon = center?.lon;
  // Rounded so a GPS wobble of a few metres does not redraw the map.
  const r = Math.round(radiusM / 50) * 50;
  const r2 = Math.round(outerM / 50) * 50;

  useEffect(() => {
    if (!ready || !ref.current || !Number.isFinite(lat) || !Number.isFinite(lon) || !(r > 0)) return;
    ref.current.injectJavaScript(`window.setRange(${lat}, ${lon}, ${r}, ${Math.max(r, r2)}); true;`);
  }, [ready, lat, lon, r, r2]);

  return (
    <View
      pointerEvents="none"
      style={[s.box, { height, backgroundColor: t.surface2, borderRadius: t.radiusSm }, style]}
    >
      <WebView
        key={t.scheme}
        ref={ref}
        source={{ html, baseUrl: "https://rangely.app/" }}
        originWhitelist={["*"]}
        applicationNameForUserAgent={APP_UA}
        onMessage={(e) => {
          if (e.nativeEvent.data === "ready") {
            setFailed(false);
            setReady(true);
          }
        }}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        javaScriptEnabled
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        androidLayerType="hardware"
        style={[s.web, { backgroundColor: t.surface2 }]}
      />
      {failed && (
        <View style={[s.note, { backgroundColor: t.surface, borderColor: t.line }]}>
          <Text style={[s.noteText, { color: t.text2 }]}>The map needs internet. The distance above still holds.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  box: { overflow: "hidden" },
  web: { flex: 1 },
  note: {
    position: "absolute", left: 10, right: 10, bottom: 10,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  noteText: { fontSize: 13, lineHeight: 18, fontFamily: F.semi },
});
