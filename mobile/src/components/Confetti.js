import { useEffect, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotion } from "../motion";

const COLORS = ["#22D98E", "#12B8C9", "#FFD24A", "#FF8A3D", "#8B5CFF", "#2FB8FF", "#FF4D6D"];
const COUNT = 42;

/** A small deterministic random, so the same burst looks the same each time
 *  and nothing depends on Math.random during render. */
function rand(seed) {
  let x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function Piece({ i, burst, width, height }) {
  const p = useSharedValue(0);
  const spec = useMemo(() => {
    const a = rand(i + 1), b = rand(i + 101), c = rand(i + 201), d = rand(i + 301);
    return {
      x0: width / 2 + (a - 0.5) * 60,
      dx: (b - 0.5) * width * 1.1,
      up: 140 + c * 180,
      fall: height * (0.55 + d * 0.45),
      spin: (a - 0.5) * 1440,
      w: 7 + b * 6,
      h: 10 + c * 8,
      color: COLORS[i % COLORS.length],
      delay: Math.round(d * 120),
      round: i % 5 === 0,
    };
  }, [i, width, height]);

  useEffect(() => {
    if (!burst) return;
    p.value = 0;
    p.value = withDelay(spec.delay, withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }));
  }, [burst, p, spec.delay]);

  const style = useAnimatedStyle(() => {
    const k = p.value;
    // Up fast, then down: a throw, drawn as a parabola over time.
    const y = -spec.up * Math.sin(Math.min(1, k * 1.6) * (Math.PI / 2)) + spec.fall * k * k;
    return {
      opacity: k === 0 ? 0 : k > 0.8 ? (1 - k) / 0.2 : 1,
      transform: [
        { translateX: spec.x0 + spec.dx * k },
        { translateY: height * 0.35 + y },
        { rotate: `${spec.spin * k}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: spec.w, height: spec.round ? spec.w : spec.h, borderRadius: spec.round ? spec.w / 2 : 2, backgroundColor: spec.color },
        style,
      ]}
    />
  );
}

/**
 * A burst of confetti, for the two moments that earn it: a goal hit and a
 * badge unlocked. Change `burst` to a new truthy value to fire it again. Only
 * transform and opacity animate — the cheap properties — and with "reduce
 * motion" on it draws nothing at all.
 */
export function Confetti({ burst }) {
  const reduce = useReduceMotion();
  const { width, height } = useWindowDimensions();
  if (reduce || !burst) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: COUNT }, (_, i) => (
        <Piece key={`${burst}-${i}`} i={i} burst={burst} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: "absolute", left: 0, top: 0 },
});
