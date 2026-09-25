import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { F, useTheme } from "../theme";
import { DUR, EASE, SPRING } from "../motion";
import { haptic } from "../haptics";
import { Icon } from "../ui";

/**
 * Press and hold to finish.
 *
 * Ending a ride is the one action that cannot be undone and the one most
 * likely to be hit by a glove, a bump or a pocket. A tap is too cheap for it;
 * a confirmation dialog is too slow for someone at a kerb. Holding for a
 * second — with the button filling under the thumb and a tick at each third —
 * is deliberate without being in the way.
 *
 * The fill is linear on purpose: it shows time, and time does not ease. Let go
 * early and it springs back empty. Screen readers get an "activate" action
 * that finishes directly, since holding is not a gesture they can make.
 */
export function HoldButton({ label = "Hold to finish", onComplete, duration = DUR.hold, style }) {
  const t = useTheme();
  const progress = useSharedValue(0);
  const w = useSharedValue(0);
  const timers = useRef([]);
  const done = useRef(false);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => clear, []);

  const begin = () => {
    done.current = false;
    clear();
    haptic.light();
    progress.value = withTiming(1, { duration, easing: EASE.linear });
    timers.current = [
      setTimeout(haptic.light, duration / 3),
      setTimeout(haptic.light, (2 * duration) / 3),
      setTimeout(() => {
        done.current = true;
        haptic.success();
        onComplete?.();
      }, duration),
    ];
  };

  const cancel = () => {
    clear();
    if (!done.current) progress.value = withSpring(0, SPRING.snappy);
  };

  // Full-width fill slid in with a transform: an animated percentage width
  // did not draw on Android's new architecture.
  const fill = useAnimatedStyle(() => ({
    opacity: w.value > 0 && progress.value > 0.001 ? 1 : 0,
    transform: [{ translateX: -w.value * (1 - progress.value) }],
  }));

  return (
    <Pressable
      onPressIn={begin}
      onPressOut={cancel}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Press and hold for one second"
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "activate") onComplete?.();
      }}
      onLayout={(e) => (w.value = e.nativeEvent.layout.width)}
      style={[styles.btn, { backgroundColor: t.dangerWash, borderColor: t.danger }, style]}
    >
      <View style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} pointerEvents="none">
        <Animated.View style={[styles.fill, { backgroundColor: t.dangerFill }, fill]} />
      </View>
      <View style={styles.row} pointerEvents="none">
        <Icon name="stop" size={18} color={t.danger} />
        <Text style={[styles.text, { color: t.danger }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 2,
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  text: { fontSize: 18, fontFamily: F.heavy, letterSpacing: 0.2 },
});
