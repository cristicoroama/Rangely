import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useId } from "react";
import Svg, { Circle, Defs, Line, LinearGradient, Polyline, Stop } from "react-native-svg";

import { useTheme } from "./theme";
import { fitView, projectTrack } from "./slippy";

/**
 * The ride's outline, with nothing under it.
 *
 * No tiles, no network, no waiting — which is exactly what a list of twenty
 * rides needs. You recognise a ride by its shape long before you recognise it
 * by its distance, and a shape costs one SVG path. The real map is a separate,
 * much heavier component, and it opens one ride at a time.
 */
export function RouteLine({ track, view, thick, grid }) {
  const t = useTheme();
  const id = `r${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const points = projectTrack(track, view);
  if (!points) return null;

  const [sx, sy] = view.project(track[0][0], track[0][1]);
  const [ex, ey] = view.project(track[track.length - 1][0], track[track.length - 1][1]);
  const W = view.width;
  const H = view.height;

  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
      {/* The line runs from green at the start to aqua at the finish, so the
          direction of the ride reads without arrows. */}
      <Defs>
        <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1={sx} y1={sy} x2={ex === sx && ey === sy ? ex + 1 : ex} y2={ey}>
          <Stop offset="0" stopColor={t.grad[0]} />
          <Stop offset="1" stopColor={t.grad[1]} />
        </LinearGradient>
      </Defs>
      {/* A faint street grid, so an outline on its own still reads as a map. */}
      {grid
        ? [0.25, 0.5, 0.75].map((f) => (
            <Line key={`v${f}`} x1={W * f} y1={0} x2={W * f} y2={H} stroke={t.line} strokeWidth={1} />
          )).concat(
            [0.33, 0.66].map((f) => (
              <Line key={`h${f}`} x1={0} y1={H * f} x2={W} y2={H * f} stroke={t.line} strokeWidth={1} />
            )),
          )
        : null}
      {/* A casing under the line in the colour of the ground, so the route
          reads cleanly wherever it crosses itself — the trick every map uses
          for its motorways. */}
      <Polyline
        points={points}
        fill="none"
        stroke={t.surface2}
        strokeWidth={thick + 2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Polyline
        points={points}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={thick}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Circle cx={sx} cy={sy} r={thick + 1.5} fill={t.accentFill} stroke={t.surface} strokeWidth={2} />
      <Circle cx={ex} cy={ey} r={thick + 1.5} fill={t.grad[1]} stroke={t.surface} strokeWidth={2} />
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
  const t = useTheme();
  const [width, onLayout] = useMeasuredWidth();
  const drawable = Array.isArray(track) && track.length > 1;
  const view = width && drawable ? fitView(track, width, height, { padding: 10 }) : null;

  return (
    <View
      style={[s.box, { height, backgroundColor: t.surface2, borderRadius: t.radiusSm }, style]}
      onLayout={onLayout}
    >
      {view && <RouteLine track={track} view={view} thick={thick} grid />}
    </View>
  );
}

const s = StyleSheet.create({
  box: { overflow: "hidden" },
});
