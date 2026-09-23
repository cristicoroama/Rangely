import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Stop } from "react-native-svg";

import { F, useTheme } from "../theme";
import { Icon } from "../ui";

/** Gradients for badges, handed out in order so a row of them is varied. */
export const MEDAL_COLORS = [
  ["#22D98E", "#12B8C9"],
  ["#2FB8FF", "#5B6CFF"],
  ["#FF8A3D", "#FF4D6D"],
  ["#8B5CFF", "#D946EF"],
  ["#FFD24A", "#FF9F1C"],
  ["#12B8C9", "#2F7CF6"],
];

// A pointy-topped hexagon on a 100 grid. Stroked in its own fill with a round
// join, which is the cheap way to round a polygon's corners.
const HEX = "50,9 85.5,29.5 85.5,70.5 50,91 14.5,70.5 14.5,29.5";

/**
 * A badge. Earned: a lit hexagon in its own gradient, a white glyph, a
 * highlight across the top. Not yet: the same shape flat and grey, so the
 * row still shows what there is to get.
 */
export function Medal({ icon, colors = MEDAL_COLORS[0], earned = true, size = 64, label }) {
  const t = useTheme();
  const id = `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const flat = t.scheme === "light" ? "#DCE2DF" : "#262D35";
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={label}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={id} x1="0.1" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
          <LinearGradient id={`${id}s`} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Polygon
          points={HEX}
          fill={earned ? `url(#${id})` : flat}
          stroke={earned ? `url(#${id})` : flat}
          strokeWidth={9}
          strokeLinejoin="round"
        />
        {earned ? <Polygon points={HEX} fill={`url(#${id}s)`} /> : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Icon
          name={earned ? icon : "lock"}
          size={Math.round(size * (earned ? 0.4 : 0.32))}
          color={earned ? "#FFFFFF" : t.text3}
          strokeWidth={2.4}
        />
      </View>
    </View>
  );
}

/** A level as a hexagon with its number in it. */
export function LevelMedal({ level, index, size = 72 }) {
  const id = `l${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel={`Level ${index + 1}, ${level.name}`}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={id} x1="0.1" y1="0" x2="0.9" y2="1">
            <Stop offset="0" stopColor={level.colors[0]} />
            <Stop offset="1" stopColor={level.colors[1]} />
          </LinearGradient>
          <LinearGradient id={`${id}s`} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Polygon points={HEX} fill={`url(#${id})`} stroke={`url(#${id})`} strokeWidth={9} strokeLinejoin="round" />
        <Polygon points={HEX} fill={`url(#${id}s)`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.num, { fontSize: size * 0.42, lineHeight: size * 0.46 }]}>{index + 1}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  num: {
    fontFamily: F.numHeavy, color: "#FFFFFF", includeFontPadding: false,
    textShadowColor: "rgba(0,0,0,0.25)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
});
