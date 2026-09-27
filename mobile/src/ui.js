import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Polyline, Stop } from "react-native-svg";

import { F, TYPE, useTheme } from "./theme";
import { GradientFill } from "./components/Gradient";
import { DUR, SPRING } from "./motion";
import { haptic } from "./haptics";

/**
 * Styles made once per theme, not once per render. Every component asks for
 * its styles through one of these, so a light/dark switch costs two
 * StyleSheets per component for the life of the app.
 */
export function themed(make) {
  const cache = {};
  return function useStyles() {
    const t = useTheme();
    if (!cache[t.scheme]) cache[t.scheme] = make(t);
    return [cache[t.scheme], t];
  };
}

/* ------------------------------------------------------------------ icons -- */

/**
 * Icons from Tabler Icons (MIT, tabler.io/icons) — 24-grid, 2 px strokes,
 * round caps — with the filled variants where a solid shape reads better
 * (play, pause, bolt…). The scooter is Material Symbols' rounded
 * "electric_scooter" (Apache 2.0): a stand-up e-scooter, where Tabler only
 * has a moped. Paths are inlined so there is no icon font to load: an icon
 * font would be a megabyte for the thirty glyphs used here.
 */
const ICONS = {
  route: "M3 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0 M19 7a2 2 0 1 0 0 -4a2 2 0 0 0 0 4 M11 19h5.5a3.5 3.5 0 0 0 0 -7h-8a3.5 3.5 0 0 1 0 -7h4.5",
  clock: "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0 M12 7v5l3 3",
  speed: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M13.41 10.59l2.59 -2.59 M7 12a5 5 0 0 1 5 -5",
  hill: "M6.18 10.95l2.54 3.175l.084 .093a1 1 0 0 0 1.403 -.01l1.637 -1.638l1.324 1.985a1 1 0 0 0 1.457 .226l3.632 -2.906l3.647 7.697a1 1 0 0 1 -.904 1.428h-18a1 1 0 0 1 -.904 -1.428zm5.82 -7.878a3.3 3.3 0 0 1 2.983 1.888l2.394 5.057l-3.15 2.52l-1.395 -2.092l-.075 -.099a1 1 0 0 0 -1.464 -.053l-1.711 1.709l-1.301 -1.627l-1.151 -1.435l1.888 -3.98a3.3 3.3 0 0 1 2.982 -1.888",
  bolt: "M13 2l.018 .001l.016 .001l.083 .005l.011 .002h.011l.038 .009l.052 .008l.016 .006l.011 .001l.029 .011l.052 .014l.019 .009l.015 .004l.028 .014l.04 .017l.021 .012l.022 .01l.023 .015l.031 .017l.034 .024l.018 .011l.013 .012l.024 .017l.038 .034l.022 .017l.008 .01l.014 .012l.036 .041l.026 .027l.006 .009c.12 .147 .196 .322 .218 .513l.001 .012l.002 .041l.004 .064v6h5a1 1 0 0 1 .868 1.497l-.06 .091l-8 11c-.568 .783 -1.808 .38 -1.808 -.588v-6h-5a1 1 0 0 1 -.868 -1.497l.06 -.091l8 -11l.01 -.013l.018 -.024l.033 -.038l.018 -.022l.009 -.008l.013 -.014l.04 -.036l.028 -.026l.008 -.006a1 1 0 0 1 .402 -.199l.011 -.001l.027 -.005l.074 -.013l.011 -.001l.041 -.002z",
  battery: "M6 7h11a2 2 0 0 1 2 2v.5a.5 .5 0 0 0 .5 .5a.5 .5 0 0 1 .5 .5v3a.5 .5 0 0 1 -.5 .5a.5 .5 0 0 0 -.5 .5v.5a2 2 0 0 1 -2 2h-11a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2 M7 10l0 4 M10 10l0 4 M13 10l0 4",
  trend: "M3 17l6 -6l4 4l8 -8 M14 7l7 0l0 7",
  play: "M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z",
  pause: "M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z",
  stop: "M17 4h-10a3 3 0 0 0 -3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3 -3v-10a3 3 0 0 0 -3 -3z",
  check: "M5 12l5 5l10 -10",
  chevron: "M9 6l6 6l-6 6",
  back: "M15 6l-6 6l6 6",
  close: "M18 6l-12 12 M6 6l12 12",
  list: "M9 6l11 0 M9 12l11 0 M9 18l11 0 M5 6l0 .01 M5 12l0 .01 M5 18l0 .01",
  gear: "M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065 M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
  helmet: "M12 4a9 9 0 0 1 5.656 16h-11.312a9 9 0 0 1 5.656 -16 M20 9h-8.8a1 1 0 0 0 -.968 1.246c.507 2 1.596 3.418 3.268 4.254c2 1 4.333 1.5 7 1.5",
  moon: "M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008",
  light: "M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7 M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3 M9.7 17l4.6 0",
  warning: "M12 9v4 M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0 M12 16h.01",
  target: "M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
  trophy: "M8 21l8 0 M12 17l0 4 M7 4l10 0 M17 4v8a5 5 0 0 1 -10 0v-8 M3 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M17 9a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
  flame: "M10 2c0 -.88 1.056 -1.331 1.692 -.722c1.958 1.876 3.096 5.995 1.75 9.12l-.08 .174l.012 .003c.625 .133 1.203 -.43 2.303 -2.173l.14 -.224a1 1 0 0 1 1.582 -.153c1.334 1.435 2.601 4.377 2.601 6.27c0 4.265 -3.591 7.705 -8 7.705s-8 -3.44 -8 -7.706c0 -2.252 1.022 -4.716 2.632 -6.301l.605 -.589c.241 -.236 .434 -.43 .618 -.624c1.43 -1.512 2.145 -2.924 2.145 -4.78",
  star: "M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z",
  sun: "M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7",
  lock: "M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6 M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0 M8 11v-4a4 4 0 1 1 8 0v4",
  sparkle: "M16 19a1 1 0 0 1 0 -2a1 1 0 0 0 1 -1c0 -1.333 2 -1.333 2 0a1 1 0 0 0 1 1c1.333 0 1.333 2 0 2a1 1 0 0 0 -1 1c0 1.333 -2 1.333 -2 0a1 1 0 0 0 -1 -1 M3 11a5 5 0 0 0 5 -5c0 -1.333 2 -1.333 2 0a5 5 0 0 0 5 5c1.333 0 1.333 2 0 2a5 5 0 0 0 -5 5a1 1 0 0 1 -2 0a5 5 0 0 0 -5 -5c-1.333 0 -1.333 -2 0 -2 M16 7a1 1 0 0 1 0 -2a1 1 0 0 0 1 -1c0 -1.333 2 -1.333 2 0a1 1 0 0 0 1 1c1.333 0 1.333 2 0 2a1 1 0 0 0 -1 1c0 1.333 -2 1.333 -2 0a1 1 0 0 0 -1 -1",
  calendar: "M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12 M16 3v4 M8 3v4 M4 11h16 M11 15h1 M12 15v3",
  camera: "M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2 M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
  photo: "M15 8h.01 M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12 M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5 M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3",
  trash: "M4 7l16 0 M10 11l0 6 M14 11l0 6 M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12 M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3",
  cameraPlus: "M12 20h-7a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v3.5 M16 19h6 M19 16v6 M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
  // Weather
  cloud: "M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878",
  rain: "M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7 M11 13v2m0 3v2m4 -5v2m0 3v2",
  snow: "M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7 M11 15v.01m0 3v.01m0 3v.01m4 -4v.01m0 3v.01",
  fog: "M7 16a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-12 M5 20l14 0",
  storm: "M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1 M13 14l-2 4l3 0l-2 4",
  wind: "M5 8h8.5a2.5 2.5 0 1 0 -2.34 -3.24 M3 12h15.5a2.5 2.5 0 1 1 -2.34 3.24 M4 16h5.5a2.5 2.5 0 1 1 -2.34 3.24",
  temp: "M10 13.5a4 4 0 1 0 4 0v-8.5a2 2 0 0 0 -4 0v8.5 M10 9l4 0",
  // Backup and places
  download: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2 M7 11l5 5l5 -5 M12 4l0 12",
  upload: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2 M7 9l5 -5l5 5 M12 4l0 12",
  shield: "M11.46 20.846a12 12 0 0 1 -7.96 -14.846a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3a12 12 0 0 1 -.09 7.06 M15 19l2 2l4 -4",
  location: "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M12 2l0 2 M12 20l0 2 M20 12l2 0 M2 12l2 0",
  pin: "M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0 M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0",
};

/** Icons that are not on the 24-grid stroke system: their own viewBox, filled. */
const SPECIAL = {
  scooter: {
    viewBox: "0 -960 960 960",
    d: "M191-240q-46.25 0-78.62-32.32Q80-304.65 80-350.82q0-46.18 32.38-78.68Q144.75-462 191-462q38 0 69 21t39 57h240q8-72 57-124.5T717-574l-63-286H526q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h130q21 0 37.5 13t21.5 34l71 326q2 7.97-3.43 14.48Q777.13-526 769-526q-67 0-117.5 45.5T596-370q-2 19-14.22 32.5T552-324H299q-8 38-39 61t-69 23Zm36-75q15-15 15-36t-15-36q-15-15-36-15t-36 15q-15 15-15 36t15 36q15 15 36 15t36-15Zm463.5 42.68q-32.5-32.33-32.5-78.5 0-46.18 32.32-78.68 32.33-32.5 78.5-32.5 46.18 0 78.68 32.32 32.5 32.33 32.5 78.5 0 46.18-32.32 78.68-32.33 32.5-78.5 32.5-46.18 0-78.68-32.32ZM805-315q15-15 15-36t-15-36q-15-15-36-15t-36 15q-15 15-15 36t15 36q15 15 36 15t36-15ZM523-118v53q0 8-7 13t-15 1l-179-92q-5-3-3.91-8.5 1.09-5.5 6.91-5.5h119v-54q0-8 7-13t15-1l180 93q5 2.95 3.5 8.47Q648-118 642-118H523ZM191-351Zm578 0Z",
  },
};

const FILLED = new Set(["bolt", "flame", "hill", "pause", "play", "sparkle", "star", "stop"]);

export function Icon({ name, size = 16, color, strokeWidth = 2 }) {
  const t = useTheme();
  const c = color ?? t.text2;
  const special = SPECIAL[name];
  const d = special ? special.d : ICONS[name];
  if (!d) return null;
  const filled = !!special || FILLED.has(name);
  // Wrapped in a View so it stacks like every other view: on the web a bare
  // <svg> paints beneath positioned siblings, which hid icons on gradients.
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} viewBox={special ? special.viewBox : "0 0 24 24"}>
        <Path
          d={d}
          fill={filled ? c : "none"}
          stroke={filled ? "none" : c}
          strokeWidth={filled ? 0 : strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ press -- */

/**
 * Anything tappable. It sinks a few percent under the finger in about a tenth
 * of a second and springs back — the whole of the feedback most taps need —
 * and can add a haptic for the ones that change something.
 */
export function Press({ onPress, onLongPress, disabled, style, outerStyle, children, scaleTo = 0.97, feel, hitSlop, accessibilityLabel, accessibilityRole = "button", accessibilityState }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={
        onPress &&
        (() => {
          if (feel) haptic[feel]?.();
          onPress();
        })
      }
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withTiming(scaleTo, { duration: DUR.press });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING.snappy);
      }}
      disabled={disabled}
      style={outerStyle}
      hitSlop={hitSlop ?? 6}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
    >
      <Animated.View style={[style, anim, disabled && { opacity: 0.45 }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ----------------------------------------------------------------- button -- */

const useButtonStyles = themed((t) =>
  StyleSheet.create({
    base: {
      minHeight: 56,
      borderRadius: 18,
      paddingHorizontal: 22,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    big: { minHeight: 72, borderRadius: 22 },
    small: { minHeight: 44, borderRadius: 14, paddingHorizontal: 16 },
    primary: {
      backgroundColor: t.grad[0],
      overflow: "hidden",
      boxShadow: t.scheme === "light" ? "0px 10px 24px rgba(20,170,120,0.35)" : "0px 8px 28px rgba(34,217,142,0.28)",
    },
    danger: { backgroundColor: t.dangerFill },
    secondary: { backgroundColor: t.surface2, borderWidth: 1, borderColor: t.line },
    ghost: { backgroundColor: "transparent" },
    text: { ...TYPE.button },
    textBig: { fontSize: 19, letterSpacing: 0.3 },
    textSmall: { fontSize: 15 },
  }),
);

/** `outerStyle` places the button (flex, margins); `style` dresses it. */
export function Button({ title, onPress, tone = "primary", size = "normal", icon, disabled, feel = "light", style, outerStyle }) {
  const [s, t] = useButtonStyles();
  const ink =
    tone === "primary" ? t.gradInk : tone === "danger" ? "#FFFFFF" : tone === "ghost" ? t.text2 : t.text;
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      feel={feel}
      accessibilityLabel={title}
      outerStyle={outerStyle}
      style={[s.base, size === "big" && s.big, size === "small" && s.small, s[tone], style]}
    >
      {tone === "primary" ? <GradientFill colors={t.grad} dir="across" /> : null}
      {icon ? <Icon name={icon} size={size === "big" ? 22 : 18} color={ink} /> : null}
      <Text style={[s.text, size === "big" && s.textBig, size === "small" && s.textSmall, { color: ink }]}>
        {title}
      </Text>
    </Press>
  );
}

/* ------------------------------------------------------------ typography -- */

const useTextStyles = themed((t) =>
  StyleSheet.create({
    label: { ...TYPE.label, color: t.text3 },
    body: { ...TYPE.body, color: t.text2 },
    strong: { ...TYPE.bodyStrong, color: t.text },
    small: { ...TYPE.small, color: t.text3 },
    heading: { ...TYPE.heading, color: t.text },
    title: { ...TYPE.title, color: t.text },
  }),
);

/** Text in one of the scale's roles. */
export function Txt({ role = "body", style, children, ...rest }) {
  const [s] = useTextStyles();
  return (
    <Text style={[s[role], style]} {...rest}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------- card -- */

const useCardStyles = themed((t) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: t.radius,
      padding: t.pad,
      borderWidth: t.scheme === "light" ? 0 : 1,
      borderColor: t.line,
      // Light cards float on a soft, wide shadow; dark ones on a hairline,
      // because a shadow on near-black is invisible and a border on white is
      // fussy.
      boxShadow: t.cardShadow,
    },
    flat: { backgroundColor: t.surface2, boxShadow: "none", borderWidth: 0 },
    accent: { backgroundColor: t.accentWash, boxShadow: "none", borderWidth: 0 },
    warn: { backgroundColor: t.warnWash, boxShadow: "none", borderWidth: 0 },
  }),
);

export function Card({ children, style, tone }) {
  const [s] = useCardStyles();
  return <View style={[s.card, tone && s[tone], style]}>{children}</View>;
}

/* ------------------------------------------------------------------- stat -- */

const useStatStyles = themed((t) =>
  StyleSheet.create({
    stat: { flex: 1, minWidth: 80 },
    row: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    value: { ...TYPE.value, color: t.text },
    big: { ...TYPE.display },
    unit: { fontFamily: F.bold, fontSize: 13, color: t.text3 },
    unitBig: { fontSize: 20 },
    labelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  }),
);

/** A number with its label. The unit sits beside the value, smaller, so a row
 *  of these lines up on the digits and not on the units. */
export function Stat({ label, value, unit, icon, big, tone, style, onHero }) {
  const [s, t] = useStatStyles();
  const color = onHero
    ? t.onHero
    : tone === "accent" ? t.accent : tone === "danger" ? t.danger : tone === "warn" ? t.warn : t.text;
  return (
    <View style={[s.stat, style]} accessible accessibilityLabel={`${label}: ${value}${unit ? " " + unit : ""}`}>
      <View style={s.row}>
        <Text style={[s.value, big && s.big, { color }]} maxFontSizeMultiplier={1.3}>
          {value}
        </Text>
        {unit ? <Text style={[s.unit, big && s.unitBig, onHero && { color: t.onHero3 }]}>{unit}</Text> : null}
      </View>
      <View style={s.labelRow}>
        {icon ? <Icon name={icon} size={12} color={onHero ? t.onHero3 : t.text3} /> : null}
        <Txt role="label" style={onHero && { color: t.onHero3 }}>{label}</Txt>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------- pill -- */

const usePillStyles = themed((t) =>
  StyleSheet.create({
    pill: {
      flexDirection: "row", alignItems: "center", gap: 6,
      borderRadius: t.pill, paddingHorizontal: 11, paddingVertical: 5,
      backgroundColor: t.surface2,
    },
    accent: { backgroundColor: t.accentWash },
    warn: { backgroundColor: t.warnWash },
    danger: { backgroundColor: t.dangerWash },
    aqua: { backgroundColor: t.aquaWash },
    hero: { backgroundColor: t.heroFill },
    text: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.3, color: t.text2 },
  }),
);

/** A state, not an action. Carries an icon as well as a colour, so it reads
 *  for someone who cannot tell green from red. */
export function Pill({ children, tone, icon }) {
  const [s, t] = usePillStyles();
  const color =
    tone === "accent" ? t.accent : tone === "warn" ? t.warn : tone === "danger" ? t.danger
      : tone === "aqua" ? t.aqua : tone === "hero" ? t.onHero : t.text2;
  return (
    <View style={[s.pill, tone && s[tone]]}>
      {icon ? <Icon name={icon} size={13} color={color} /> : null}
      <Text style={[s.text, { color }]}>{children}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- section -- */

export function SectionTitle({ children, right, style }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 12 }, style]}>
      <Txt role="label">{children}</Txt>
      {right}
    </View>
  );
}

/* -------------------------------------------------------------- sparkline -- */

/** A trend as a line with its ground filled in, the latest point marked —
 *  the value a rider cares about is this week's. The marker is a View laid
 *  over the drawing rather than an SVG circle, because the drawing stretches
 *  to fit and a stretched circle is an egg. */
export function Sparkline({ values, height = 52 }) {
  const t = useTheme();
  const nums = (values || []).filter((v) => Number.isFinite(v));
  if (nums.length < 2) return null;

  const W = 100;
  const H = 36;
  const pad = 3;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const pts = nums.map((v, i) => [(i / (nums.length - 1)) * W, H - pad - ((v - min) / span) * (H - pad * 2)]);
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `M0,${H} L${line.split(" ").join(" L")} L${W},${H} Z`;
  const ly = pts[pts.length - 1][1];

  return (
    <View style={{ height, marginTop: 14 }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={t.grad[1]} />
            <Stop offset="1" stopColor={t.grad[0]} />
          </LinearGradient>
          <LinearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.grad[0]} stopOpacity="0.28" />
            <Stop offset="1" stopColor={t.grad[0]} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#sparkArea)" />
        <Polyline
          points={line}
          fill="none"
          stroke="url(#spark)"
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: "absolute", right: -4, top: (ly / H) * height - 4,
          width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent,
        }}
      />
    </View>
  );
}

/* ----------------------------------------------------------------- toggle -- */

const useToggleStyles = themed((t) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
    title: { ...TYPE.bodyStrong, color: t.text },
    sub: { ...TYPE.small, color: t.text3, marginTop: 1 },
    track: { width: 50, height: 30, borderRadius: 15, justifyContent: "center" },
    knob: { position: "absolute", top: 3, width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF", boxShadow: "0px 1px 3px rgba(0,0,0,0.25)" },
  }),
);

/** A setting that is on or off: the whole row is the switch, not just the
 *  knob, because a 50-point target on a moving scooter is a small target. */
export function ToggleRow({ title, sub, value, onChange, icon, tone = "green" }) {
  const [s, t] = useToggleStyles();
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withTiming(value ? 1 : 0, { duration: DUR.quick });
  }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 3 + x.value * 20 }] }));
  return (
    <Press
      feel="tap"
      scaleTo={0.99}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: !!value }}
      style={s.row}
    >
      {icon ? <IconTile name={icon} tone={tone} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </View>
      <View style={[s.track, { backgroundColor: value ? t.accentFill : t.lineStrong }]}>
        <Animated.View style={[s.knob, knob]} />
      </View>
    </Press>
  );
}

/* -------------------------------------------------------------- icon tile -- */

const TILE_TONES = {
  green: (t) => ({ bg: t.accentWash, fg: t.accent }),
  aqua: (t) => ({ bg: t.aquaWash, fg: t.aqua }),
  warn: (t) => ({ bg: t.warnWash, fg: t.warn }),
  danger: (t) => ({ bg: t.dangerWash, fg: t.danger }),
  grey: (t) => ({ bg: t.surface2, fg: t.text2 }),
  hero: (t) => ({ bg: t.heroFill, fg: t.onHero }),
};

/** An icon in a tinted rounded square — the colour that tells sections apart
 *  at a glance, the way a phone's own settings do. `tone="grad"` fills it
 *  with the brand gradient for the few things that deserve it. */
export function IconTile({ name, tone = "green", size = 40, icon = 20, style }) {
  const t = useTheme();
  const grad = tone === "grad";
  const c = grad ? { bg: t.grad[0], fg: t.gradInk } : (TILE_TONES[tone] ?? TILE_TONES.green)(t);
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size * 0.32, alignItems: "center", justifyContent: "center", backgroundColor: c.bg, overflow: "hidden" },
        style,
      ]}
    >
      {grad ? <GradientFill colors={t.grad} /> : null}
      <Icon name={name} size={icon} color={c.fg} strokeWidth={2.2} />
    </View>
  );
}
