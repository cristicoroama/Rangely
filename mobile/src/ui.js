import { Text, View, Pressable, StyleSheet } from "react-native";
import { T } from "./theme";

/** A number with its label. The unit sits next to the value at a smaller size
 *  so a column of these lines up on the digits rather than on the units. */
export function Stat({ label, value, unit, big }) {
  return (
    <View style={s.stat}>
      <View style={s.statRow}>
        <Text style={[s.statValue, big && s.statValueBig]}>{value}</Text>
        {unit ? <Text style={s.statUnit}>{unit}</Text> : null}
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ title, onPress, tone = "accent", disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        tone === "danger" && s.btnDanger,
        tone === "ghost" && s.btnGhost,
        disabled && s.btnDisabled,
        pressed && !disabled && s.btnPressed,
      ]}
    >
      <Text style={[s.btnText, tone === "ghost" && s.btnTextGhost]}>{title}</Text>
    </Pressable>
  );
}

/**
 * A trend, drawn with nothing but Views.
 *
 * A chart library for eight bars would be a megabyte of dependency to say
 * "it is going down". Bars are scaled between the smallest and largest value
 * with a floor, so a flat series reads as flat instead of as noise amplified
 * to full height.
 */
export function Sparkline({ values, height = 34 }) {
  const nums = (values || []).filter((v) => Number.isFinite(v));
  if (nums.length < 2) return null;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min;

  return (
    <View style={[s.spark, { height }]}>
      {nums.map((v, i) => {
        // No span means every ride measured the same: half height, flat.
        const frac = span > 0 ? (v - min) / span : 0.5;
        return (
          <View
            key={i}
            style={[
              s.sparkBar,
              {
                height: Math.max(3, (0.25 + 0.75 * frac) * height),
                backgroundColor: i === nums.length - 1 ? T.accent : T.accentDim,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** A small label that carries a state, not an action. */
export function Pill({ children, tone = "dim" }) {
  return (
    <View style={[s.pill, tone === "accent" && s.pillAccent]}>
      <Text style={[s.pillText, tone === "accent" && s.pillTextAccent]}>{children}</Text>
    </View>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{children}</Text>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: T.card,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: T.radius,
    padding: T.pad,
  },
  stat: { flex: 1, minWidth: 92 },
  statRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  statValue: { color: T.text, fontSize: 22, fontWeight: "800" },
  statValueBig: { fontSize: 44 },
  statUnit: { color: T.dim, fontSize: 12, fontWeight: "600" },
  statLabel: {
    color: T.dim, fontSize: 11, marginTop: 2,
    textTransform: "uppercase", letterSpacing: 1,
  },
  btn: {
    backgroundColor: T.accent, borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 22, alignItems: "center",
  },
  btnDanger: { backgroundColor: T.danger },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: T.border },
  btnDisabled: { opacity: 0.45 },
  btnPressed: { opacity: 0.8 },
  btnText: { color: "#07100b", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  btnTextGhost: { color: T.text },
  spark: { flexDirection: "row", alignItems: "flex-end", gap: 3, marginTop: 14 },
  sparkBar: { flex: 1, borderRadius: 2, minWidth: 3 },
  pill: {
    backgroundColor: T.cardHi, borderColor: T.border, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
  },
  pillAccent: { borderColor: T.accentDim },
  pillText: {
    color: T.dim, fontSize: 10, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  pillTextAccent: { color: T.accent },
  sectionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 26, marginBottom: 10,
  },
  section: {
    color: T.dim, fontSize: 12, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1.6,
  },
});
