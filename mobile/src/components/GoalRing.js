import { useEffect, useId } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { useTheme } from "../theme";
import { DUR, EASE } from "../motion";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The week, as a ring that fills.
 *
 * One ring, drawn in the brand gradient with a soft glow under it — a single
 * ring on purpose, so it reads as Rangely's and not as a copy of anyone's
 * three. It animates from where it was to where it is, so saving a ride and
 * landing back on home shows the ring take the new kilometres, which is the
 * whole reward, in three quarters of a second. Under "reduce motion"
 * Reanimated jumps straight to the end.
 *
 * `onHero` draws the empty track in translucent white, for the dark panel.
 */
export function GoalRing({ fraction, size = 132, stroke = 12, onHero, children }) {
  const t = useTheme();
  const id = `ring${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // Room for the glow, which is almost twice as wide as the ring itself.
  const r = size / 2 - stroke;
  const C = 2 * Math.PI * r;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, fraction || 0)), {
      duration: DUR.ring,
      easing: EASE.enter,
    });
  }, [fraction, p]);

  const arc = useAnimatedProps(() => ({
    strokeDashoffset: C * (1 - p.value),
    // A round cap on an empty arc still draws a dot; hide it at zero.
    strokeOpacity: p.value > 0.002 ? 1 : 0,
  }));
  const glow = useAnimatedProps(() => ({
    strokeDashoffset: C * (1 - p.value),
    strokeOpacity: p.value > 0.002 ? 0.28 : 0,
  }));

  const c = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor={t.grad[1]} />
              <Stop offset="1" stopColor={t.grad[0]} />
            </LinearGradient>
          </Defs>
          <Circle cx={c} cy={c} r={r} stroke={onHero ? t.heroLine : t.surface2} strokeWidth={stroke} fill="none" />
          <AnimatedCircle
            cx={c} cy={c} r={r}
            stroke={t.grad[0]}
            strokeWidth={stroke * 1.9}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${C} ${C}`}
            animatedProps={glow}
          />
          <AnimatedCircle
            cx={c} cy={c} r={r}
            stroke={`url(#${id})`}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${C} ${C}`}
            animatedProps={arc}
          />
        </Svg>
      </View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
