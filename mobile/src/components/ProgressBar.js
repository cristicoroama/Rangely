import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useTheme } from "../theme";
import { DUR, EASE } from "../motion";
import { GradientFill } from "./Gradient";

/** A bar that fills to `fraction`, animated on the way in and on every
 *  change. Filled with the brand gradient unless given its own colours.
 *
 *  The fill is full width and slides in from the left with a transform —
 *  animating a percentage width did not draw on Android's new architecture. */
export function ProgressBar({ fraction, height = 10, colors, track, style }) {
  const t = useTheme();
  const p = useSharedValue(0);
  const w = useSharedValue(0);

  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, fraction || 0)), { duration: DUR.ring, easing: EASE.enter });
  }, [fraction, p]);

  const fill = useAnimatedStyle(() => ({
    opacity: w.value > 0 && p.value > 0.001 ? 1 : 0,
    transform: [{ translateX: -w.value * (1 - p.value) }],
  }));

  return (
    <View
      onLayout={(e) => (w.value = e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: height / 2, backgroundColor: track ?? t.surface2, overflow: "hidden" }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round((fraction || 0) * 100) }}
    >
      <Animated.View
        style={[
          { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: height / 2, overflow: "hidden" },
          fill,
        ]}
      >
        <GradientFill colors={colors ?? t.grad} dir="across" />
      </Animated.View>
    </View>
  );
}
