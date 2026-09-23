import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { F, useTheme } from "../theme";
import { DUR } from "../motion";
import { Icon, Press } from "../ui";
import { Choice } from "./Choice";
import { BRANDS, DISPLAYS, OTHER, findScooter, overLegalSpeed, scootersOf } from "../scooters";
import { LOCAL } from "../rules";

/**
 * The presets, a brand at a time: pick the maker, then the model. Each shows
 * its pack size, which is the number nobody knows off the top of their head,
 * and "Another scooter" is always at the bottom for everything else.
 *
 * `bleed` lets the brand row run to the screen edges when the list sits in
 * padding that belongs to its own scroll view; zero when it does not.
 */
export function ScooterList({ value, onPick, bleed = 18 }) {
  const t = useTheme();
  const current = findScooter(value);
  const [brand, setBrand] = useState(current?.brand ?? BRANDS[0]);
  const models = scootersOf(brand);

  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: bleed }}
        style={{ marginHorizontal: -bleed }}
      >
        {BRANDS.map((b) => {
          const on = b === brand;
          return (
            <Press
              key={b}
              feel="tap"
              onPress={() => setBrand(b)}
              accessibilityRole="tab"
              accessibilityLabel={b}
              style={[
                styles.brand,
                { backgroundColor: on ? t.text : t.surface, borderColor: on ? t.text : t.line },
              ]}
            >
              <Text style={[styles.brandText, { color: on ? t.bg : t.text2 }]}>{b}</Text>
            </Press>
          );
        })}
      </ScrollView>

      <Animated.View key={brand} entering={FadeIn.duration(DUR.quick)} style={{ gap: 8 }}>
        {models.map((m) => (
          <Choice
            key={m.key}
            title={m.name}
            right={`${m.packWh} Wh`}
            subtitle={overLegalSpeed(m, LOCAL.maxKmh) ? `Up to ${m.maxKmh} km/h out of the box` : null}
            selected={value === m.key}
            onPress={() => onPick(m)}
          />
        ))}
      </Animated.View>
      <Choice
        title={OTHER.name}
        subtitle="Type its battery size yourself"
        selected={value === OTHER.key}
        onPress={() => onPick(OTHER)}
      />
    </View>
  );
}

/**
 * A note for models that leave the factory faster than the law allows. Said
 * once, plainly, where the model is chosen — not a warning on every screen.
 */
export function SpeedNote({ model, onHero, style }) {
  const t = useTheme();
  const preset = findScooter(model);
  if (!overLegalSpeed(preset, LOCAL.maxKmh)) return null;
  return (
    <View
      style={[
        styles.note,
        style,
        onHero
          ? { backgroundColor: "rgba(245,165,36,0.16)", borderColor: "rgba(245,165,36,0.35)" }
          : { backgroundColor: t.warnWash, borderColor: "transparent" },
      ]}
    >
      <Icon name="speed" size={18} color={onHero ? "#FFC56B" : t.warn} />
      <Text style={[styles.noteText, { color: onHero ? t.onHero2 : t.text2 }]}>
        This one can do {preset.maxKmh} km/h. In Romania an e-scooter is limited to {LOCAL.maxKmh} km/h
        — faster than that it counts as a moped, with licence and insurance rules. Keep it on the{" "}
        {LOCAL.maxKmh} km/h setting on public roads.
      </Text>
    </View>
  );
}

const DISPLAY_TEXT = {
  app: { title: "Exact percent, in its phone app", subtitle: "Most precise", icon: "battery" },
  number: { title: "A number on the handlebar", subtitle: "Dualtron and others", icon: "bolt" },
  bars10: { title: "Ten bars on the handlebar", subtitle: "KuKirin and others", icon: "list" },
  bars: { title: "Five bars on the handlebar", subtitle: "Xiaomi and Segway dashboards", icon: "list" },
};

export function DisplayList({ value, onPick }) {
  return (
    <View style={{ gap: 8 }}>
      {DISPLAYS.map((d) => {
        const x = DISPLAY_TEXT[d.key] ?? { title: d.label };
        return (
          <Choice
            key={d.key}
            icon={x.icon}
            title={x.title}
            subtitle={x.subtitle}
            selected={value === d.key}
            onPress={() => onPick(d.key)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { height: 40, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, justifyContent: "center" },
  brandText: { fontFamily: F.bold, fontSize: 14 },
  note: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: 16, padding: 14, borderWidth: 1 },
  noteText: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19, flex: 1 },
});
