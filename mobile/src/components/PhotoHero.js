import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotion } from "../motion";
import { GradientFill } from "./Gradient";

/**
 * The welcome photo: a real scooter at golden hour (Unsplash, free licence),
 * kept small on purpose — 1080 px wide, about 125 KB. A phone-camera original
 * (3551 × 4730 here) decodes to a 67 MB bitmap, which Android either refuses
 * to draw, leaving a blank screen, or crashes on. Replace the file with any
 * photo resized the same way and nothing else changes.
 */
export const WELCOME_PHOTO = require("../../assets/images/welcome.jpg");
export const WELCOME_ASPECT = 1080 / 1208;

/** "#07100D" → "rgba(7,16,13,a)" — SVG stops are safest with rgba. */
function rgba(hex, a) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * A photo behind content, in two ways:
 *
 *   mode="top"   — the whole photo across the top of the screen at its own
 *                  proportions, melting into `base` below it, where the words
 *                  go. Nothing is cropped off the sides, so the scooter stays
 *                  whole on a tall phone.
 *   mode="cover" — fills its box (a card), cropped to fit, with a gradient
 *                  over it so white text stays readable.
 *
 * Either way it pushes in slowly — the "Ken Burns" move — unless the phone
 * asks for reduced motion. `resizeMethod="resize"` makes Android decode a
 * big camera photo at the size it is shown, not at twelve megapixels.
 */
export function PhotoHero({
  source = WELCOME_PHOTO,
  aspect = WELCOME_ASPECT,
  mode = "cover",
  base = "#07100D",
  fade = ["rgba(6,14,12,0)", "rgba(6,14,12,0.55)", "rgba(6,14,12,0.96)"],
  zoom = true,
  children,
  style,
}) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(zoom && !reduce ? 1.1 : 1);

  useEffect(() => {
    if (!zoom || reduce) return;
    scale.value = withTiming(1, { duration: 9000, easing: Easing.out(Easing.quad) });
  }, [zoom, reduce, scale]);

  const push = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (mode === "top") {
    return (
      <View style={[styles.box, { backgroundColor: base }, style]}>
        <Animated.View style={[{ width: "100%", aspectRatio: aspect }, push]}>
          <Image source={source ?? WELCOME_PHOTO} style={styles.photo} resizeMode="cover" resizeMethod="resize" />
          {/* The lower part of the photo dissolves into the background. */}
          <GradientFill colors={[rgba(base, 0), rgba(base, 0.55), rgba(base, 0.92), rgba(base, 1), rgba(base, 1)]} dir="down" style={{ top: "48%", bottom: -2 }} />
        </Animated.View>
        {/* A little shade under the status bar, so its icons read on sky. */}
        <GradientFill colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)"]} dir="down" style={{ bottom: "82%" }} />
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.box, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, push]}>
        <Image source={source ?? WELCOME_PHOTO} style={styles.photo} resizeMode="cover" resizeMethod="resize" />
      </Animated.View>
      <GradientFill colors={fade} dir="down" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: "hidden", backgroundColor: "#0A1512" },
  photo: { width: "100%", height: "100%" },
});
