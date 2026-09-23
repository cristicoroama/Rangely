import { useEffect, useState } from "react";
import { Text } from "react-native";

import { DUR, useReduceMotion } from "../motion";

/**
 * A number that counts up to itself.
 *
 * Used once, on the finish screen, where watching the kilometres land is the
 * small reward for having ridden them. Ease-out cubic over under a second,
 * staggered per figure by the caller, and skippable: pass `skip` and every
 * figure snaps to its value. Under "reduce motion" it never counts at all.
 *
 * Driven from JavaScript rather than a worklet: it runs for less than a
 * second on one screen, and re-rendering a Text sixty times is cheaper than
 * the machinery needed to animate text on the UI thread.
 */
export function useCountUp(target, { duration = DUR.count, delay = 0, skip = false } = {}) {
  const reduce = useReduceMotion();
  const instant = reduce || skip || !Number.isFinite(target);
  const [value, setValue] = useState(instant ? target : 0);

  useEffect(() => {
    if (instant) {
      setValue(target);
      return undefined;
    }
    let raf = null;
    let start = null;
    const step = (ts) => {
      if (start == null) start = ts;
      const k = Math.min(1, (ts - start) / duration);
      setValue(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    const wait = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(wait);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [target, duration, delay, instant]);

  return value;
}

export function CountUp({ value, format = (v) => v.toFixed(0), style, delay, skip, ...rest }) {
  const v = useCountUp(value, { delay, skip });
  return (
    <Text style={style} accessibilityLabel={format(value)} {...rest}>
      {format(v)}
    </Text>
  );
}
