import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { F, TYPE, useTheme } from "../theme";
import { Icon, Press } from "../ui";

/**
 * One option out of several, as a row big enough to hit with a thumb: title,
 * an optional line under it, and a round mark that fills when chosen. The
 * chosen row is outlined in green as well as marked, so the choice reads at a
 * glance and without colour.
 */
export function Choice({ title, subtitle, right, selected, onPress, icon, style }) {
  const t = useTheme();
  return (
    <Press
      onPress={onPress}
      feel="tap"
      accessibilityRole="radio"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={[
        styles.row,
        {
          backgroundColor: selected ? t.accentWash : t.surface,
          borderColor: selected ? t.accent : t.line,
        },
        style,
      ]}
    >
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: selected ? t.accentFill : t.surface2 }]}>
          <Icon name={icon} size={20} color={selected ? t.accentInk : t.text2} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, { color: t.text3 }]}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={[styles.right, { color: selected ? t.accent : t.text3 }]}>{right}</Text> : null}
      <View style={[styles.radio, { borderColor: selected ? t.accent : t.lineStrong }]}>
        {selected ? (
          <Animated.View entering={ZoomIn.duration(160)} style={[styles.dot, { backgroundColor: t.accent }]} />
        ) : null}
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { ...TYPE.bodyStrong },
  sub: { ...TYPE.small, marginTop: 1 },
  right: { fontSize: 14, fontFamily: F.heavy, fontVariant: ["tabular-nums"] },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
