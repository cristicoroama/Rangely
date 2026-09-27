import { View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

import { RouteShape } from "./routeShape";
import { useTheme } from "./theme";

/**
 * The web build has no native map, and wiring Google's JS SDK in for a
 * browser preview nobody rides with would be a second map to maintain. Metro
 * picks this file on web and the drawn outline stands in — same route, same
 * colours, no pan and no streets.
 */
export function RealMap({ track, height = 320, style }) {
  return <RouteShape track={track} height={height} thick={3.5} style={style} />;
}

/** The "there and back" picture without tiles: the same circle and ring on a
 *  faint grid, drawn to the same framing as the real map. */
export function RangeMap({ radiusM, outerM, height = 200, style }) {
  const t = useTheme();
  const W = 340;
  const H = height;
  const r = H / 2 / 1.28;
  const r2 = outerM > 0 && radiusM > 0 ? (r * outerM) / radiusM : r * 2;
  return (
    <View style={[{ height, borderRadius: t.radiusSm, overflow: "hidden", backgroundColor: t.surface2 }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <Line key={`v${f}`} x1={W * f} y1={0} x2={W * f} y2={H} stroke={t.line} strokeWidth={1} />
        ))}
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={`h${f}`} x1={0} y1={H * f} x2={W} y2={H * f} stroke={t.line} strokeWidth={1} />
        ))}
        <Circle cx={W / 2} cy={H / 2} r={r2} stroke={t.grad[1]} strokeWidth={2} strokeDasharray="6 7" fill="none" />
        <Circle cx={W / 2} cy={H / 2} r={r} stroke={t.accentFill} strokeWidth={3} fill={t.accentFill} fillOpacity={0.15} />
        <Circle cx={W / 2} cy={H / 2} r={12} fill={t.accentFill} fillOpacity={0.28} />
        <Circle cx={W / 2} cy={H / 2} r={7.5} fill={t.accentFill} stroke="#FFFFFF" strokeWidth={3} />
      </Svg>
    </View>
  );
}
