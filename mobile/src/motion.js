import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { Easing } from "react-native-reanimated";

/**
 * Motion, in numbers.
 *
 * The budget is short on purpose. Feedback on a press is about a tenth of a
 * second; anything the rider sees often stays under 300 ms; the only long
 * sequences are the rare ones worth watching — the end of a ride — and even
 * those finish inside a second and a half and stop the moment you tap.
 */
export const DUR = {
  press: 110,
  quick: 180,
  base: 280,
  slow: 420,
  ring: 750,
  count: 900,
  hold: 1000, // finishing a ride: long enough that it cannot happen by accident
};

export const EASE = {
  // Material's standard and emphasized-decelerate curves.
  standard: Easing.bezier(0.2, 0, 0, 1),
  enter: Easing.bezier(0.05, 0.7, 0.1, 1),
  exit: Easing.bezier(0.3, 0, 0.8, 0.15),
  // Time-based progress is the one place linear is right.
  linear: Easing.linear,
};

/** Springs with at most a hint of bounce: brisk, not playful. */
export const SPRING = {
  snappy: { damping: 20, stiffness: 320, mass: 1 },
  soft: { damping: 22, stiffness: 180, mass: 1 },
};

/**
 * The phone's "reduce motion" setting, live.
 *
 * Reanimated honours it for its own animations; this is for the ones driven
 * from JavaScript (the count-up numbers), which should jump to their final
 * value instead of counting. Read with a listener rather than once, because
 * people change it while an app is open.
 */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => alive && setReduce(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => setReduce(!!v));
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
}
