import { StyleSheet, Text, View } from "react-native";

import { F, useTheme } from "../theme";
import { Icon, Press } from "../ui";
import { GradientFill } from "./Gradient";
import { MODES, modesFor } from "../modes";

/**
 * Which mode you are riding in, by the name on your own handlebar — "3 ·
 * Race" on a KuKirin, "S" on a Segway — each lit in its own colour when
 * chosen, so Eco reads green and Sport reads hot at a glance. Scooters with a
 * second motor get a Dual switch beside it.
 */
export function ModePicker({ preset, value, onChange, dual, onDual }) {
  const t = useTheme();
  const modes = modesFor(preset);
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.row} accessibilityRole="radiogroup">
        {modes.map((m) => {
          const on = value === m.mode;
          return (
            <Press
              key={m.mode}
              feel="tap"
              onPress={() => onChange(m.mode)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${m.label}, ${MODES[m.mode].name}`}
              outerStyle={{ flex: 1 }}
              style={[styles.chip, { backgroundColor: t.surface2, borderColor: on ? "transparent" : t.line }]}
            >
              {on ? <GradientFill colors={MODES[m.mode].colors} /> : null}
              <Text style={[styles.label, { color: on ? "#FFFFFF" : t.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {m.label}
              </Text>
              {/* "D" and "S" need a word under them; "1 · Eco" already has one. */}
              {m.label.length <= 3 ? (
                <Text style={[styles.kind, { color: on ? "rgba(255,255,255,0.8)" : t.text3 }]}>{MODES[m.mode].name}</Text>
              ) : null}
            </Press>
          );
        })}
      </View>
      {preset?.dual ? (
        <Press
          feel="tap"
          onPress={() => onDual(!dual)}
          accessibilityRole="switch"
          accessibilityState={{ checked: !!dual }}
          accessibilityLabel="Dual motor"
          style={[styles.dual, { backgroundColor: dual ? t.accentWash : t.surface2, borderColor: dual ? t.accent : "transparent" }]}
        >
          <Icon name="bolt" size={18} color={dual ? t.accent : t.text3} />
          <Text style={[styles.dualText, { color: dual ? t.accent : t.text2 }]}>Dual motor</Text>
          <View style={[styles.switch, { backgroundColor: dual ? t.accentFill : t.lineStrong }]}>
            <View style={[styles.knob, dual ? { right: 3 } : { left: 3 }]} />
          </View>
        </Press>
      ) : null}
    </View>
  );
}

/** A mode as a small coloured tag, for lists and the ride screen. */
export function ModeTag({ mode, label, onHero }) {
  const t = useTheme();
  const m = MODES[mode];
  if (!m) return null;
  return (
    <View style={[styles.tag, { backgroundColor: onHero ? "rgba(255,255,255,0.1)" : t.surface2 }]}>
      <View style={[styles.dot, { backgroundColor: m.colors[0] }]} />
      <Text style={[styles.tagText, { color: onHero ? "#FFFFFF" : t.text2 }]} numberOfLines={1}>
        {label || m.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  chip: {
    minHeight: 60, borderRadius: 16, borderWidth: 1.5, overflow: "hidden",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  label: { fontFamily: F.heavy, fontSize: 16 },
  kind: { fontFamily: F.semi, fontSize: 11, marginTop: 1 },
  dual: {
    flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48,
    borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14,
  },
  dualText: { fontFamily: F.bold, fontSize: 15, flex: 1 },
  switch: { width: 44, height: 26, borderRadius: 13 },
  knob: { position: "absolute", top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tagText: { fontFamily: F.bold, fontSize: 12 },
});
