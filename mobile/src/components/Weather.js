import { StyleSheet, Text, View } from "react-native";

import { F, useTheme } from "../theme";
import { Icon } from "../ui";
import { fmtTemp, weatherKind } from "../weather";

/**
 * The weather as a small chip — icon and temperature — for lists, headers
 * and the ride's own page. Cold is tinted blue and heat amber, so a winter
 * ride with a poor range figure explains itself at a glance.
 */
export function WeatherChip({ weather, onHero, wind = false, style }) {
  const t = useTheme();
  const kind = weatherKind(weather?.code);
  if (!weather || !Number.isFinite(weather.tempC)) return null;
  const cold = weather.tempC < 8;
  const hot = weather.tempC >= 30;
  const tint = onHero ? t.onHero : cold ? t.aqua : hot ? t.warn : t.text2;
  return (
    <View
      style={[
        s.chip,
        { backgroundColor: onHero ? "rgba(255,255,255,0.1)" : cold ? t.aquaWash : hot ? t.warnWash : t.surface2 },
        style,
      ]}
      accessible
      accessibilityLabel={`${kind?.label ?? "Weather"}, ${Math.round(weather.tempC)} degrees${
        wind && Number.isFinite(weather.windKmh) ? `, wind ${weather.windKmh} kilometres an hour` : ""
      }`}
    >
      <Icon name={kind?.icon ?? "temp"} size={14} color={tint} />
      <Text style={[s.text, { color: tint }]}>{fmtTemp(weather.tempC)}</Text>
      {wind && Number.isFinite(weather.windKmh) && weather.windKmh >= 15 ? (
        <>
          <Icon name="wind" size={13} color={onHero ? t.onHero3 : t.text3} />
          <Text style={[s.text, { color: onHero ? t.onHero3 : t.text3 }]}>{weather.windKmh}</Text>
        </>
      ) : null}
    </View>
  );
}

/** One line: "12° · Cloudy · wind 18 km/h". */
export function weatherLine(weather) {
  if (!weather || !Number.isFinite(weather.tempC)) return "";
  const kind = weatherKind(weather.code);
  const parts = [fmtTemp(weather.tempC)];
  if (kind) parts.push(kind.label);
  if (Number.isFinite(weather.windKmh)) parts.push(`wind ${weather.windKmh} km/h`);
  return parts.join(" · ");
}

const s = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  text: { fontFamily: F.bold, fontSize: 12.5, fontVariant: ["tabular-nums"] },
});
