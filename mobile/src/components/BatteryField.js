import { useEffect, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { F, useTheme } from "../theme";
import { SPRING } from "../motion";
import { haptic } from "../haptics";
import { Icon, Press, Txt } from "../ui";
import { GradientFill } from "./Gradient";
import { parsePercent } from "../ride";

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

/** Green when there is plenty, amber when it is getting low, red near empty —
 *  the same colours the scooter's own gauge uses. */
function levelColors(t, n) {
  if (!Number.isFinite(n)) return t.grad;
  if (n <= 15) return ["#FF6B5E", t.dangerFill];
  if (n <= 35) return ["#FFC44D", t.warnFill];
  return t.grad;
}

/**
 * A battery you drag.
 *
 * The number people need to type twice per ride, made into the easiest
 * gesture on a phone: touch the battery where its level is, slide to adjust,
 * nudge with − and + for the last percent. It ticks under the thumb every
 * ten percent. Empty until touched — "not entered" and "0%" are different
 * things, and an energy figure built on a pretend zero would be a lie.
 */
function BatterySlider({ value, onChange, label }) {
  const t = useTheme();
  const n = parsePercent(value);
  const has = Number.isFinite(n);
  const width = useRef(1);
  const start = useRef(0);
  const last = useRef(has ? n : null);
  const [dragging, setDragging] = useState(false);
  // The responder is built once; it reaches the current callback through a
  // ref instead of keeping the first render's.
  const change = useRef(onChange);
  change.current = onChange;

  const set = (v) => {
    const c = clamp(v);
    if (last.current == null || Math.floor(c / 10) !== Math.floor(last.current / 10)) haptic.tap();
    last.current = c;
    change.current(String(c));
  };
  const setRef = useRef(set);
  setRef.current = set;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      // Once the thumb is on the battery, a sideways drag is the battery's,
      // not the page's.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        start.current = e.nativeEvent.locationX;
        setDragging(true);
        setRef.current((start.current / width.current) * 100);
      },
      onPanResponderMove: (_, g) => setRef.current(((start.current + g.dx) / width.current) * 100),
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;

  const colors = levelColors(t, n);
  const level = useSharedValue(has ? n : 0);
  useEffect(() => {
    level.value = withSpring(has ? Math.max(n, 3) : 0, SPRING.snappy);
  }, [has, n, level]);
  const fill = useAnimatedStyle(() => ({ width: `${level.value}%` }));

  return (
    <View style={styles.sliderRow}>
      <Press
        onPress={() => set((has ? n : 51) - 1)}
        feel="tap"
        accessibilityLabel={`${label}: one less`}
        style={[styles.nudge, { backgroundColor: t.surface2 }]}
      >
        <Text style={[styles.nudgeText, { color: t.text }]}>−</Text>
      </Press>

      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        <View
          {...pan.panHandlers}
          onLayout={(e) => (width.current = Math.max(1, e.nativeEvent.layout.width))}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: has ? n : undefined, text: has ? `${n} percent` : "not set" }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) =>
            set((has ? n : 50) + (e.nativeEvent.actionName === "increment" ? 5 : -5))
          }
          style={[
            styles.body,
            {
              borderColor: dragging ? t.accent : t.lineStrong,
              backgroundColor: t.surface2,
            },
          ]}
        >
          <Animated.View style={[styles.fill, fill]} pointerEvents="none">
            <GradientFill colors={colors} dir="across" />
          </Animated.View>
          <View style={styles.center} pointerEvents="none">
            {has ? (
              <Text style={[styles.pctText, { color: t.text }]}>
                {n}
                <Text style={styles.pctSign}>%</Text>
              </Text>
            ) : (
              <Animated.View entering={FadeIn} style={styles.hintRow}>
                <Icon name="chevron" size={14} color={t.text3} />
                <Text style={[styles.dragHint, { color: t.text3 }]}>Slide to set</Text>
              </Animated.View>
            )}
          </View>
        </View>
        <View style={[styles.cap, { backgroundColor: dragging ? t.accent : t.lineStrong }]} />
      </View>

      <Press
        onPress={() => set((has ? n : 49) + 1)}
        feel="tap"
        accessibilityLabel={`${label}: one more`}
        style={[styles.nudge, { backgroundColor: t.surface2 }]}
      >
        <Text style={[styles.nudgeText, { color: t.text }]}>+</Text>
      </Press>
    </View>
  );
}

/** One-tap answers for the common cases: a full charge, or where the last
 *  ride left off. */
function Suggestions({ items, value, onChange }) {
  const t = useTheme();
  const n = parsePercent(value);
  if (!items?.length) return null;
  return (
    <View style={styles.chips}>
      {items.map((s) => {
        const on = n === s.value;
        return (
          <Press
            key={s.label}
            feel="tap"
            onPress={() => onChange(String(s.value))}
            accessibilityLabel={`${s.label}, ${s.value} percent`}
            style={[
              styles.chip,
              { backgroundColor: on ? t.accentWash : t.surface2, borderColor: on ? t.accent : "transparent" },
            ]}
          >
            <Text style={[styles.chipText, { color: on ? t.accent : t.text2 }]}>
              {s.label} · <Text style={{ fontFamily: F.heavy }}>{s.value}%</Text>
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

/**
 * The two numbers the whole app runs on, asked for the way the rider reads
 * them. A scooter that shows a percentage gets the battery to drag; one that
 * shows five bars gets five bars to tap — asking someone to convert bars to a
 * percentage in their head is how the energy half of the app gets skipped.
 *
 * The value is always a percentage string either way, so everything
 * downstream stays the same.
 */
export function BatteryField({ label, value, onChange, display = "app", hint, suggestions }) {
  const t = useTheme();

  if (display === "bars") {
    const bars = Number.isFinite(parsePercent(value)) ? Math.round(parsePercent(value) / 20) : null;
    return (
      <View style={styles.wrap}>
        <Txt role="strong">{label}</Txt>
        <View style={styles.barsRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
          {[0, 1, 2, 3, 4, 5].map((k) => {
            const on = bars === k;
            return (
              <Press
                key={k}
                onPress={() => onChange(String(k * 20))}
                feel="tap"
                accessibilityRole="radio"
                accessibilityLabel={`${k} bar${k === 1 ? "" : "s"}`}
                outerStyle={{ flex: 1 }}
                style={[
                  styles.barChip,
                  { backgroundColor: on ? t.accentWash : t.surface2, borderColor: on ? t.accent : "transparent" },
                ]}
              >
                <View style={styles.glyph}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.cell, { backgroundColor: i < k ? (on ? t.accent : t.text2) : t.line }]} />
                  ))}
                </View>
                <Text style={[styles.barNum, { color: on ? t.accent : t.text2 }]}>{k}</Text>
              </Press>
            );
          })}
        </View>
        {hint ? <Txt role="small">{hint}</Txt> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Txt role="strong">{label}</Txt>
      <BatterySlider value={value} onChange={onChange} label={label} />
      <Suggestions items={suggestions} value={value} onChange={onChange} />
      {hint ? (
        <View style={styles.hintLine}>
          <Icon name="battery" size={13} color={t.text3} />
          <Txt role="small" style={{ flex: 1 }}>{hint}</Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  nudge: { width: 48, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  nudgeText: { fontSize: 26, fontFamily: F.bold, marginTop: -2 },
  body: { flex: 1, height: 64, borderRadius: 18, borderWidth: 2.5, overflow: "hidden", justifyContent: "center", userSelect: "none" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 14, overflow: "hidden" },
  cap: { width: 6, height: 24, borderTopRightRadius: 4, borderBottomRightRadius: 4, marginLeft: 3 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  pctText: { fontFamily: F.numHeavy, fontSize: 34, lineHeight: 38, fontVariant: ["tabular-nums"], includeFontPadding: false },
  pctSign: { fontFamily: F.num, fontSize: 22 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dragHint: { fontFamily: F.bold, fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, justifyContent: "center" },
  chipText: { fontFamily: F.semi, fontSize: 14 },
  hintLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  barsRow: { flexDirection: "row", gap: 8 },
  barChip: { minHeight: 64, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center", gap: 6 },
  glyph: { flexDirection: "row", gap: 2 },
  cell: { width: 4, height: 12, borderRadius: 1 },
  barNum: { fontSize: 15, fontFamily: F.heavy },
});
