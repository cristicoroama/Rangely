import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F, TYPE } from "../theme";
import { DUR } from "../motion";
import { haptic } from "../haptics";
import { Button, Card, Icon, IconTile, SectionTitle, Stat, Txt, themed } from "../ui";
import { CountUp } from "../components/CountUp";
import { BatteryField } from "../components/BatteryField";
import { HeroPanel } from "../components/Gradient";
import { Confetti } from "../components/Confetti";
import { LevelMedal, MEDAL_COLORS, Medal } from "../components/Medal";
import { ProgressBar } from "../components/ProgressBar";
import { RouteMap } from "../map";
import { avgSpeed, energyStats, fmtDuration, isEnergySample, msToKmh } from "../ride";
import { displayResolution } from "../scooters";
import { weeklyProgress } from "../goals";
import { BADGES, newlyEarned, riderLevel } from "../achievements";
import { dayLabel, timeLabel } from "../when";
import { useKeyboardHeight } from "../useKeyboard";

const enter = (i) => FadeInDown.delay(250 + i * 80).duration(DUR.base);
const colorOf = (key) => MEDAL_COLORS[BADGES.findIndex((b) => b.key === key) % MEDAL_COLORS.length];

/**
 * The end of a ride: the reward first, the paperwork second.
 *
 * The distance counts up on the dark panel while a tick springs in. If the
 * ride unlocked anything — a badge, a level, the week's goal — it says so
 * with the one burst of confetti in the app. Then the battery, right under the
 * numbers, because the reading at the end is what turns a GPS track into a
 * measured range; setting it can unlock a badge on the spot. Save is one
 * press; discarding asks first.
 */
export function FinishScreen({
  ride, rides, profile, scooter, batteryStart, onBatteryStart, batteryEnd, onBatteryEnd, onSave, onDiscard,
}) {
  const [s, t] = useStyles();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();

  const km = ride.distance / 1000;
  const energy = useMemo(
    () =>
      energyStats({
        batteryStart,
        batteryEnd,
        packWh: Number(scooter.packWh),
        distanceM: ride.distance,
        resolution: displayResolution(scooter.display),
      }),
    [batteryStart, batteryEnd, scooter.packWh, scooter.display, ride.distance],
  );
  const counts = energy ? isEnergySample({ ...ride, energy }) : false;

  // What this ride would add, worked out as if it were already saved.
  const goalKm = profile.goalKm;
  const candidate = useMemo(
    () => ({ ...ride, id: "pending", startedAt: ride.startedAt ?? Date.now(), energy }),
    [ride, energy],
  );
  const after = useMemo(() => [candidate, ...rides], [candidate, rides]);
  const unlocked = useMemo(() => newlyEarned(rides, after, { goalKm }), [rides, after, goalKm]);
  const lvBefore = useMemo(() => riderLevel(rides), [rides]);
  const lvAfter = useMemo(() => riderLevel(after), [after]);
  const levelUp = lvAfter.index > lvBefore.index;
  const weekBefore = useMemo(() => weeklyProgress(rides, goalKm, candidate.startedAt), [rides, goalKm, candidate.startedAt]);
  const weekAfter = useMemo(() => weeklyProgress(after, goalKm, candidate.startedAt), [after, goalKm, candidate.startedAt]);
  const goalNow = weekAfter.met && !weekBefore.met;

  // Confetti on arrival if there is something to celebrate, and again each
  // time a new badge appears (setting the battery can unlock one).
  const [burst, setBurst] = useState(0);
  const seen = useRef(-1);
  const wins = unlocked.length + (levelUp ? 1 : 0) + (goalNow ? 1 : 0);
  useEffect(() => {
    if (wins > 0 && wins > seen.current) {
      const first = seen.current < 0;
      const id = setTimeout(() => {
        setBurst((b) => b + 1);
        haptic.success();
      }, first ? 700 : 150);
      seen.current = wins;
      return () => clearTimeout(id);
    }
    seen.current = Math.max(seen.current, wins);
    return undefined;
  }, [wins]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 16 + kb }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeroPanel style={[s.hero, { paddingTop: insets.top + 18 }]}>
          <View style={s.head}>
            <Animated.View entering={ZoomIn.delay(80).springify().damping(12).stiffness(180)} style={s.badge}>
              <Icon name="check" size={30} color={t.gradInk} strokeWidth={3.2} />
            </Animated.View>
            <Animated.View entering={FadeIn.delay(160).duration(DUR.base)} style={{ flex: 1 }}>
              <Text style={s.title}>Nice ride!</Text>
              <Text style={s.when}>
                {dayLabel(ride.startedAt)} · {timeLabel(ride.startedAt)}
              </Text>
            </Animated.View>
          </View>
          <View style={s.heroRow}>
            <CountUp value={km} format={(v) => v.toFixed(2)} style={s.heroValue} delay={250} />
            <Text style={s.heroUnit}>km</Text>
          </View>
          <View style={s.statsRow}>
            <Stat onHero label="Moving" icon="clock" value={fmtDuration(ride.movingTime)} />
            <Stat onHero label="Average" icon="speed" value={msToKmh(avgSpeed(ride)).toFixed(1)} unit="km/h" />
            <Stat onHero label="Climbed" icon="hill" value={String(Math.round(ride.ascent || 0))} unit="m" />
          </View>
          {ride.gaps > 0 ? (
            <View style={s.gapRow}>
              <Icon name="warning" size={14} color="#FFC56B" />
              <Text style={s.gapText}>
                The GPS dropped out {ride.gaps === 1 ? "once" : `${ride.gaps} times`}. Those stretches
                are not counted.
              </Text>
            </View>
          ) : null}
        </HeroPanel>

        <View style={s.body}>
          {wins > 0 ? (
            <Animated.View entering={enter(0)}>
              <SectionTitle>Unlocked</SectionTitle>
              <View style={{ gap: 10 }}>
                {goalNow ? (
                  <Animated.View entering={ZoomIn.delay(700).springify().damping(13)}>
                    <Card style={s.winCard}>
                      <IconTile name="target" tone="grad" size={56} icon={28} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.winTitle}>Weekly goal reached!</Text>
                        <Txt role="small">{weekAfter.km.toFixed(1)} of {goalKm} km this week</Txt>
                      </View>
                    </Card>
                  </Animated.View>
                ) : null}
                {levelUp ? (
                  <Animated.View entering={ZoomIn.delay(780).springify().damping(13)}>
                    <Card style={s.winCard}>
                      <LevelMedal level={lvAfter.level} index={lvAfter.index} size={56} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.winTitle}>Level up: {lvAfter.level.name}</Text>
                        <Txt role="small">Level {lvAfter.index + 1} · {Math.round(lvAfter.km)} km ridden</Txt>
                      </View>
                    </Card>
                  </Animated.View>
                ) : null}
                {unlocked.map((b, i) => (
                  <Animated.View key={b.key} entering={ZoomIn.delay(860 + i * 90).springify().damping(13)}>
                    <Card style={s.winCard}>
                      <Medal icon={b.icon} colors={colorOf(b.key)} size={56} label={b.name} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.winTitle}>{b.name}</Text>
                        <Txt role="small">{b.how}</Txt>
                      </View>
                    </Card>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          ) : lvAfter.next ? (
            <Animated.View entering={enter(0)}>
              <SectionTitle>Level {lvAfter.index + 1} · {lvAfter.level.name}</SectionTitle>
              <Card>
                <View style={s.levelLine}>
                  <LevelMedal level={lvAfter.level} index={lvAfter.index} size={48} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <Txt role="strong">
                      {lvAfter.toNextKm.toFixed(lvAfter.toNextKm < 10 ? 1 : 0)} km to {lvAfter.next.name}
                    </Txt>
                    <ProgressBar fraction={lvAfter.fraction} colors={lvAfter.next.colors} />
                  </View>
                </View>
              </Card>
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(1)}>
            <SectionTitle>Battery</SectionTitle>
            <Card style={{ gap: 20 }}>
              <BatteryField label="At the start" value={batteryStart} onChange={onBatteryStart} display={scooter.display} />
              <BatteryField label="Now" value={batteryEnd} onChange={onBatteryEnd} display={scooter.display} />

              {energy ? (
                <Animated.View entering={FadeIn.duration(DUR.base)} style={[s.energy, { backgroundColor: t.accentWash }]}>
                  <View style={s.energyRow}>
                    <Stat label="Range" tone="accent" value={`~${Math.round(energy.estimatedRangeKm)}`} unit="km" />
                    <Stat label="Per 1%" value={energy.kmPerPct.toFixed(2)} unit="km" />
                    <Stat label="Used" value={String(Math.round(energy.usedPct))} unit="%" />
                  </View>
                  <Txt role="small" style={{ marginTop: 12 }}>
                    {counts
                      ? "Measured on this ride, from your own battery readings."
                      : "Saved — but too short to count toward battery health. That takes at least 2 km and 10% of battery."}
                  </Txt>
                </Animated.View>
              ) : (
                <View style={s.hintRow}>
                  <Icon name="battery" size={14} color={t.text3} />
                  <Txt role="small" style={{ flex: 1 }}>
                    Set both to see how far your scooter really goes. You can skip this — the ride
                    is saved either way.
                  </Txt>
                </View>
              )}
            </Card>
          </Animated.View>

          {ride.track?.length > 1 ? (
            <Animated.View entering={enter(2)}>
              <SectionTitle>Route</SectionTitle>
              <RouteMap track={ride.track} height={240} />
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(3)} style={{ marginTop: 24, gap: 8 }}>
            <Button title="Save ride" icon="check" size="big" feel="success" onPress={onSave} />
            <Button title="Discard" tone="ghost" feel="warning" onPress={onDiscard} />
          </Animated.View>
        </View>
      </ScrollView>
      <Confetti burst={burst} />
    </View>
  );
}

const useStyles = themed((t) =>
  StyleSheet.create({
    body: { paddingHorizontal: 18 },
    hero: {
      borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 34, borderBottomRightRadius: 34,
      paddingHorizontal: 20, paddingBottom: 22,
    },
    head: { flexDirection: "row", alignItems: "center", gap: 14 },
    badge: {
      width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
      backgroundColor: t.grad[0], boxShadow: "0px 6px 20px rgba(34,217,142,0.45)",
    },
    title: { ...TYPE.title, color: t.onHero },
    when: { fontFamily: F.medium, fontSize: 14, color: t.onHero2 },
    heroRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 14 },
    heroValue: { ...TYPE.display, fontSize: 92, lineHeight: 90, color: t.onHero },
    heroUnit: { fontFamily: F.num, fontSize: 30, color: t.onHero3 },
    statsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
    gapRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14 },
    gapText: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: t.onHero2, flex: 1 },
    winCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14 },
    winTitle: { ...TYPE.heading, color: t.text },
    levelLine: { flexDirection: "row", alignItems: "center", gap: 14 },
    energy: { borderRadius: t.radiusSm, padding: 14, paddingTop: 2 },
    energyRow: { flexDirection: "row", gap: 12, marginTop: 12 },
    hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  }),
);
