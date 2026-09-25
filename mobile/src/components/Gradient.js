import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { useTheme } from "../theme";

/** React's ids look like ":r3:", and a colon inside url(#…) ends the reference. */
function useSvgId(prefix) {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * Split a colour into an opaque colour and its alpha. Android's SVG renderer
 * ignores the alpha inside an rgba() stop colour — "rgba(0,0,0,0.35)" paints
 * solid black — so transparency has to travel as stopOpacity instead.
 */
export function splitAlpha(color) {
  const c = String(color).trim();
  const m = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (m) return { color: `rgb(${m[1]},${m[2]},${m[3]})`, alpha: m[4] == null ? 1 : Number(m[4]) };
  const h = c.match(/^#([0-9a-f]{6})([0-9a-f]{2})$/i);
  if (h) return { color: `#${h[1]}`, alpha: parseInt(h[2], 16) / 255 };
  return { color: c, alpha: 1 };
}

/** A gradient stop that keeps its transparency on every platform. */
function stop(key, offset, color, opacity = 1) {
  const { color: c, alpha } = splitAlpha(color);
  return <Stop key={key} offset={offset} stopColor={c} stopOpacity={alpha * opacity} />;
}

const DIRS = {
  diag: { x1: "0", y1: "0", x2: "1", y2: "1" },
  across: { x1: "0", y1: "0.5", x2: "1", y2: "0.5" },
  down: { x1: "0.5", y1: "0", x2: "0.5", y2: "1" },
};

/**
 * A gradient laid behind whatever sits on top of it. SVG rather than a native
 * gradient module: react-native-svg is already in the app, draws the same on
 * Android, iOS and the web, and costs nothing new to install.
 */
export function GradientFill({ colors, dir = "diag", opacity = 1, style }) {
  const id = useSvgId("g");
  const d = DIRS[dir] ?? DIRS.diag;
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} {...d}>
            {colors.map((c, i) => stop(i, String(i / Math.max(1, colors.length - 1)), c, opacity))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Soft light pooled in two corners — the "mesh" look, from two radial fades. */
export function Glow({ a, b }) {
  const ida = useSvgId("ga");
  const idb = useSvgId("gb");
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id={ida} cx="0.12" cy="0.05" r="0.75" fx="0.12" fy="0.05">
            {stop("a0", "0", a)}
            {stop("a1", "1", a, 0)}
          </RadialGradient>
          <RadialGradient id={idb} cx="0.95" cy="0.95" r="0.7" fx="0.95" fy="0.95">
            {stop("b0", "0", b)}
            {stop("b1", "1", b, 0)}
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${ida})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${idb})`} />
      </Svg>
    </View>
  );
}

/**
 * The deep, lit panel the most important thing on a screen sits in: the
 * week's ring on home, the numbers on the ride screen, the result at the end.
 * Dark in both themes on purpose — it is the one place the light theme goes
 * dark, and the contrast is what makes it the first thing you look at.
 */
export function HeroPanel({ children, style, radius }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius ?? t.radius + 4,
          overflow: "hidden",
          backgroundColor: t.hero[1],
          boxShadow: t.scheme === "light" ? "0px 14px 34px rgba(8,40,32,0.28)" : "none",
        },
        style,
      ]}
    >
      <GradientFill colors={t.hero} />
      <Glow a={t.heroGlowA} b={t.heroGlowB} />
      {children}
    </View>
  );
}
