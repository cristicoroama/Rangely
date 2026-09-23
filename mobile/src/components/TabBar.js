import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F, useTheme } from "../theme";
import { SPRING } from "../motion";
import { haptic } from "../haptics";
import { Icon } from "../ui";

/**
 * Three tabs, icon and label both, always visible.
 *
 * Icons alone are guesswork for anyone new to an app, and a label costs
 * nothing at the bottom of a screen. The highlight slides between tabs on a
 * soft spring, so the eye follows where it went instead of re-finding it.
 * Sits above Android's navigation bar, whatever its height.
 */
export function TabBar({ tabs, active, onChange }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const index = Math.max(0, tabs.findIndex((tab) => tab.key === active));
  const slot = width / tabs.length;

  useEffect(() => {
    if (width) x.value = withSpring(index * slot, SPRING.soft);
  }, [index, slot, width, x]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: t.surface, borderTopColor: t.line, paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={styles.row} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Animated.View style={[styles.slot, { width: slot }, slide]} pointerEvents="none">
            <View style={[styles.highlight, { backgroundColor: t.accentWash }]} />
          </Animated.View>
        )}
        {tabs.map((tab) => {
          const on = tab.key === active;
          const color = on ? t.accent : t.text3;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => {
                if (!on) {
                  haptic.tap();
                  onChange(tab.key);
                }
              }}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: on }}
            >
              <Icon name={tab.icon} size={22} color={color} />
              <Text style={[styles.label, { color }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingHorizontal: 12 },
  row: { flexDirection: "row" },
  slot: { position: "absolute", top: 0, bottom: 0, left: 0, padding: 2 },
  highlight: { flex: 1, borderRadius: 16 },
  tab: { flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 3 },
  label: { fontSize: 12, fontFamily: F.bold, letterSpacing: 0.2 },
});
