import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme";

/**
 * The recording light: a dot that breathes, slowly — well under the three
 * flashes a second where flicker becomes a seizure risk, and still under
 * "reduce motion", where Reanimated leaves it lit and steady. It is never the
 * only signal: the word RECORDING sits beside it.
 */
export function RecDot({ size = 10, paused }) {
  const t = useTheme();
  const o = useSharedValue(1);

  useEffect(() => {
    if (paused) {
      cancelAnimation(o);
      o.value = 1;
      return undefined;
    }
    o.value = withRepeat(withTiming(0.25, { duration: 900 }), -1, true);
    return () => cancelAnimation(o);
  }, [paused, o]);

  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  const color = paused ? t.warn : t.danger;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
      />
    </View>
  );
}
