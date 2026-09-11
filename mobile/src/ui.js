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
  sectionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 26, marginBottom: 10,
  },
  section: {
    color: T.dim, fontSize: 12, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1.6,
  },
});
