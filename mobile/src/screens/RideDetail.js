import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { F, TYPE } from "../theme";
import { DUR } from "../motion";
import { Button, Card, Icon, IconTile, Pill, Press, SectionTitle, Stat, Txt, themed } from "../ui";
import { HeroPanel } from "../components/Gradient";
import { ModeTag } from "../components/ModePicker";
import { RouteMap } from "../map";
import { WeatherChip, weatherLine } from "../components/Weather";
import { WEATHER_CREDIT } from "../weather";
import { avgSpeed, fmtDuration, isEnergySample, msToKmh } from "../ride";
import { dayLabel, timeLabel } from "../when";

const enter = (i) => FadeInDown.delay(120 + i * 70).duration(DUR.base);

/**
 * One ride, opened from the list: the real map first, then everything that
 * was measured. Top speed lives here and only here — it is your data and you
 * can see it, it just never becomes the headline.
 *
 * A layer over the tabs rather than a Modal: a Modal is its own Android
 * window, with its own status bar that the app cannot restyle.
 */
export function RideDetail({ ride, onClose, onDelete }) {
  const [s, t] = useStyles();
  const insets = useSafeAreaInsets();
  const e = ride.energy;
  const hasTrack = (ride.track?.length ?? 0) > 1;

  const confirmDelete = () =>
    Alert.alert("Delete this ride?", "It will be gone for good.", [
      { text: "Keep it", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(ride.id) },
    ]);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar style={t.statusBar} />
      <View style={s.bar}>
        <Press onPress={onClose} style={s.round} accessibilityLabel="Back" hitSlop={10}>
          <Icon name="back" size={22} color={t.text} />
        </Press>
        <View style={{ flex: 1 }}>
          <Text style={s.barTitle}>{dayLabel(ride.startedAt)}</Text>
          <Txt role="small">
            {timeLabel(ride.startedAt)}
            {ride.scooter ? ` · ${ride.scooter}` : ""}
          </Txt>
        </View>
        {ride.mode ? <ModeTag mode={ride.mode} label={ride.modeLabel} /> : null}
        {ride.dual ? <ModeTag mode="turbo" label="Dual" /> : null}
        {ride.demo ? <Pill>Demo</Pill> : null}
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enter(0)}>
          {hasTrack ? (
            <RouteMap track={ride.track} height={340} />
          ) : (
            <Card tone="flat">
              <Txt>No route was kept for this ride.</Txt>
            </Card>
          )}
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <HeroPanel style={s.panel}>
            <View style={s.heroRow}>
              <Text style={s.hero}>{(ride.distance / 1000).toFixed(2)}</Text>
              <Text style={s.heroUnit}>km</Text>
            </View>
            <View style={s.grid}>
              <Stat onHero label="Moving" icon="clock" value={fmtDuration(ride.movingTime)} />
              <Stat onHero label="Average" icon="speed" value={msToKmh(avgSpeed(ride)).toFixed(1)} unit="km/h" />
              <Stat onHero label="Top" icon="bolt" value={msToKmh(ride.topSpeed || 0).toFixed(1)} unit="km/h" />
            </View>
            <View style={s.grid}>
              <Stat onHero label="Climbed" icon="hill" value={String(Math.round(ride.ascent || 0))} unit="m" />
              <Stat onHero label="Total" icon="clock" value={fmtDuration(ride.elapsed || 0)} />
              <Stat onHero label="Stopped" icon="pause" value={fmtDuration(Math.max(0, (ride.elapsed || 0) - (ride.movingTime || 0)))} />
            </View>
            {ride.weather ? (
              <View style={s.weatherRow}>
                <WeatherChip weather={ride.weather} onHero />
                <Text style={s.weatherText} numberOfLines={1}>
                  {weatherLine(ride.weather).split(" · ").slice(1).join(" · ")}
                  {ride.weather.precipMm >= 0.2 ? ` · ${ride.weather.precipMm} mm rain` : ""}
                </Text>
              </View>
            ) : null}
            {ride.gaps > 0 ? (
              <View style={s.note}>
                <Icon name="warning" size={14} color="#FFC56B" />
                <Text style={s.noteText}>
                  The GPS dropped out {ride.gaps === 1 ? "once" : `${ride.gaps} times`}; the line jumps
                  across, and the distance does not count those stretches.
                </Text>
              </View>
            ) : null}
          </HeroPanel>
        </Animated.View>

        {e && Number.isFinite(e.estimatedRangeKm) ? (
          <Animated.View entering={enter(2)}>
            <SectionTitle>Battery</SectionTitle>
            <Card>
              <View style={s.batteryHead}>
                <IconTile name="battery" tone="aqua" />
                <Text style={s.cardTitle}>Measured on this ride</Text>
              </View>
              {ride.battery && Number.isFinite(ride.battery.start) && Number.isFinite(ride.battery.end) ? (
                <View style={s.batteryLine}>
                  <Text style={s.batteryNum}>{ride.battery.start}%</Text>
                  <Icon name="chevron" size={18} color={t.text3} />
                  <Text style={s.batteryNum}>{ride.battery.end}%</Text>
                  <Txt role="small" style={{ marginLeft: 6 }}>used {Math.round(e.usedPct)}%</Txt>
                </View>
              ) : null}
              <View style={[s.grid, !ride.battery && { marginTop: 0 }]}>
                <Stat label="Range" tone="accent" value={`~${Math.round(e.estimatedRangeKm)}`} unit="km" />
                <Stat label="Per 1%" value={(e.kmPerPct ?? ride.distance / 1000 / e.usedPct).toFixed(2)} unit="km" />
                <Stat label="Energy" value={e.whPerKm.toFixed(1)} unit="Wh/km" />
              </View>
              {!isEnergySample(ride) ? (
                <Txt role="small" style={{ marginTop: 12 }}>
                  Too short to count toward battery health — that takes at least 2 km and 10% of battery.
                </Txt>
              ) : ride.weather && ride.weather.tempC < 10 ? (
                <Txt role="small" style={{ marginTop: 12 }}>
                  It was {Math.round(ride.weather.tempC)}° out. Batteries give less in the cold, so this range reads low.
                </Txt>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        {ride.weather ? (
          <Txt role="small" style={{ marginTop: 16, textAlign: "center" }}>{WEATHER_CREDIT}</Txt>
        ) : null}

        <Animated.View entering={enter(3)} style={{ marginTop: 24 }}>
          <Button title="Delete ride" tone="ghost" icon="close" feel="warning" onPress={confirmDelete} style={{ opacity: 0.9 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const useStyles = themed((t) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    bar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
    round: {
      width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.line,
    },
    barTitle: { ...TYPE.heading, color: t.text },
    panel: { marginTop: 12, padding: 18 },
    noteText: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: t.onHero2, flex: 1 },
    batteryHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
    cardTitle: { ...TYPE.heading, color: t.text },
    scroll: { paddingHorizontal: 18, paddingTop: 4 },
    heroRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    hero: { ...TYPE.display, color: t.onHero },
    heroUnit: { fontFamily: F.num, fontSize: 26, color: t.onHero3 },
    grid: { flexDirection: "row", gap: 12, marginTop: 16 },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 16 },
    weatherRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
    weatherText: { fontFamily: F.semi, fontSize: 13.5, color: t.onHero2, flex: 1 },
    batteryLine: { flexDirection: "row", alignItems: "center", gap: 8 },
    batteryNum: { ...TYPE.value, color: t.text },
  }),
);
