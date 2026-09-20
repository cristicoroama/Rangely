import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

import { T } from "./theme";
import { TILE, fitView, projectTrack, tilesFor } from "./slippy";

/**
 * The ride, drawn.
 *
 * Two components, because they answer different questions. `RouteShape` is the
 * outline alone — no tiles, no network, no waiting — and it belongs in a list
 * where twenty of them scroll past and all you want is to recognise which ride
 * was which. `RouteMap` puts that outline on real streets, which costs a
 * handful of tile requests, and belongs on one ride at a time.
 *
 * Tiles come from OpenStreetMap: no key, no account, no quota to sign up for,
 * and attribution is the whole of the licence. Their usage policy asks for
 * light, human-paced traffic, which is what a ride map opened by hand is.
 */
const tileUrl = ({ z, x, y }) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

function RouteLine({ track, view, thick }) {
  const points = projectTrack(track, view);
  if (!points) return null;

  const [sx, sy] = view.project(track[0][0], track[0][1]);
  const [ex, ey] = view.project(track[track.length - 1][0], track[track.length - 1][1]);

  return (
    <Svg width={view.width} height={view.height} style={StyleSheet.absoluteFill}>
      {/* A dark casing under the line, so the route reads over pale streets and
          over dark parks alike — the trick every map uses for its motorways. */}
      <Polyline
        points={points}
        fill="none"
        stroke="rgba(0,0,0,0.55)"
        strokeWidth={thick + 2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Polyline
        points={points}
        fill="none"
        stroke={T.accent}
        strokeWidth={thick}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={sx} cy={sy} r={thick + 1.5} fill={T.accent} stroke="#07100b" strokeWidth={2} />
      <Circle cx={ex} cy={ey} r={thick + 1.5} fill={T.danger} stroke="#07100b" strokeWidth={2} />
    </Svg>
  );
}

/** Width has to be measured rather than assumed: these sit inside cards whose
 *  width depends on the phone. */
function useMeasuredWidth() {
  const [width, setWidth] = useState(0);
  return [width, (e) => setWidth(Math.round(e.nativeEvent.layout.width))];
}

export function RouteShape({ track, height = 96, thick = 2.5, style }) {
  const [width, onLayout] = useMeasuredWidth();
  const view = width ? fitView(track, width, height, { padding: 10 }) : null;

  return (
    <View style={[s.box, { height }, style]} onLayout={onLayout}>
      {view && <RouteLine track={track} view={view} thick={thick} />}
    </View>
  );
}

export function RouteMap({ track, height = 300, style }) {
  const [width, onLayout] = useMeasuredWidth();
  const view = width ? fitView(track, width, height, { padding: 24 }) : null;
  const tiles = view ? tilesFor(view) : [];

  return (
    <View style={[s.box, { height }, style]} onLayout={onLayout}>
      {tiles.map((t) => (
        <Image
          key={t.key}
          source={{ uri: tileUrl(t) }}
          style={{ position: "absolute", left: t.left, top: t.top, width: TILE, height: TILE }}
          // Tiles are drawn for a white page; the app is not one.
          fadeDuration={120}
        />
      ))}
      {tiles.length > 0 && <View style={[StyleSheet.absoluteFill, s.dim]} pointerEvents="none" />}
      {view && <RouteLine track={track} view={view} thick={4} />}
      {tiles.length > 0 && <Text style={s.attribution}>{OSM_ATTRIBUTION}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: T.cardHi,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  // Enough to sit the map in a dark app without making the streets unreadable.
  dim: { backgroundColor: "rgba(12,13,16,0.42)" },
  attribution: {
    position: "absolute", right: 6, bottom: 4,
    color: T.text, fontSize: 9, opacity: 0.75,
    backgroundColor: "rgba(12,13,16,0.55)",
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4,
  },
});
