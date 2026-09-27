import { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { F, TYPE } from "../theme";
import { DUR } from "../motion";
import { Button, Card, Icon, IconTile, Pill, Press, SectionTitle, Sparkline, Txt, themed } from "../ui";
import { GoalRing } from "../components/GoalRing";
import { CountUp } from "../components/CountUp";
import { BatteryField } from "../components/BatteryField";
import { ProgressBar } from "../components/ProgressBar";
import { HeroPanel } from "../components/Gradient";
import { LevelMedal, MEDAL_COLORS, Medal } from "../components/Medal";
import { ModePicker } from "../components/ModePicker";
import { GradientFill } from "../components/Gradient";
import { RangeCard } from "../components/RangeCard";
import { WeatherChip } from "../components/Weather";
import { RouteShape } from "../map";
import { fmtDuration, isEnergySample } from "../ride";
import { coldInsight } from "../weather";
import { MODES, healthFor, modeInsight, modeLabel, modeStats } from "../modes";
import { recentWeeks, weeklyProgress } from "../goals";
import { LOCAL, isAfterDark, needsHelmetByLaw } from "../rules";
import { BADGES, badges, goalStreak, riderLevel } from "../achievements";
import { dayLabel, greeting, plural, shortDate, timeLabel } from "../when";
import { useNow } from "../useNow";
import { useKeyboardHeight } from "../useKeyboard";

/** Cards arrive one after another, a beat apart, so the eye is led down the
 *  screen in reading order instead of being handed everything at once. */
const enter = (i) => FadeInDown.delay(80 + i * 70).duration(DUR.base);

const BANDS = {
  good: { label: "Like new", tone: "accent" },
  normal: { label: "Normal wear", tone: "accent" },
  worn: { label: "Worn", tone: "warn" },
  check: { label: "Get it checked", tone: "danger" },
};

/* ------------------------------------------------------------------ hero -- */

function WeekBars({ weeks, goalKm }) {
  const [s, t] = useStyles();
  const max = Math.max(goalKm, ...weeks.map((w) => w.km)) || 1;
  const H = 40;
  return (
    <View style={s.weeks} accessibilityLabel="Last six weeks">
      {weeks.map((w, i) => {
        const current = i === weeks.length - 1;
        const h = Math.max(5, Math.round((w.km / max) * H));
        return (
          <View key={w.start} style={s.weekCol}>
            <View style={[s.weekTrack, { height: H }]}>
              <View style={[s.goalLine, { bottom: (goalKm / max) * H }]} />
              <Animated.View
                entering={FadeInDown.delay(300 + i * 50).duration(DUR.base)}
                style={[
                  s.weekBar,
                  {
                    height: h,
                    backgroundColor: w.met ? t.grad[0] : current ? "#FFFFFF" : "rgba(255,255,255,0.28)",
                  },
                ]}
              />
            </View>
            <Text style={[s.weekLabel, current && { color: t.onHero, fontFamily: F.heavy }]}>
              {current ? "Now" : shortDate(w.start)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Hero({ rides, profile, scooter, now, onOpenScooter }) {
  const [s, t] = useStyles();
  const insets = useSafeAreaInsets();
  const week = useMemo(() => weeklyProgress(rides, profile.goalKm, now), [rides, profile.goalKm, now]);
  const weeks = useMemo(() => recentWeeks(rides, profile.goalKm, now, 6), [rides, profile.goalKm, now]);
  const streak = useMemo(() => goalStreak(rides, profile.goalKm, now), [rides, profile.goalKm, now]);
  const toGo = Math.max(0, week.goalKm - week.km);

  return (
    <HeroPanel style={[s.hero, { paddingTop: insets.top + 14 }]}>
      <View style={s.heroTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.hello}>{greeting(now)}</Text>
          <Text style={s.brand}>
            Range<Text style={{ color: t.grad[0] }}>ly</Text>
          </Text>
        </View>
        <Press onPress={onOpenScooter} style={s.scooterChip} accessibilityLabel="Your scooter">
          {scooter.photo ? (
            <Image source={{ uri: scooter.photo }} style={s.chipPhoto} resizeMethod="resize" />
          ) : (
            <Icon name="scooter" size={18} color={t.onHero} />
          )}
          <Text style={s.scooterName} numberOfLines={1}>{scooter.name}</Text>
        </Press>
      </View>

      <View style={s.goalRow}>
        <GoalRing fraction={week.fraction} size={148} stroke={13} onHero>
          <CountUp value={week.km} format={(v) => v.toFixed(1)} style={s.ringValue} />
          <Text style={s.ringUnit}>of {week.goalKm} km</Text>
        </GoalRing>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={s.heroLabel}>This week</Text>
          {week.met ? (
            <Animated.View entering={ZoomIn.delay(500).springify().damping(14)}>
              <Text style={[s.goalHead, { color: t.grad[0] }]}>Goal{"\n"}reached!</Text>
            </Animated.View>
          ) : (
            <Text style={s.goalHead}>
              {toGo.toFixed(toGo < 10 ? 1 : 0)} km{"\n"}to go
            </Text>
          )}
          <Text style={s.heroSmall}>
            {plural(week.rides, "ride")} · {plural(week.daysLeft, "day")} left
          </Text>
          {streak > 0 ? (
            <Animated.View entering={ZoomIn.delay(650).duration(DUR.base)} style={{ marginTop: 2 }}>
              <Pill tone="hero" icon="flame">{`${plural(streak, "week")} in a row`}</Pill>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <WeekBars weeks={weeks} goalKm={week.goalKm} />
    </HeroPanel>
  );
}

/* ------------------------------------------------------------ night card -- */

function NightCheck({ ageBracket }) {
  const [s, t] = useStyles();
  const [done, setDone] = useState({});
  const items = [
    { key: "lights", text: "Front and rear lights on" },
    { key: "bright", text: "Wear something bright or reflective" },
    {
      key: "helmet",
      text: needsHelmetByLaw(ageBracket) ? "Helmet on — the law says so at your age" : "Helmet on",
    },
  ];
  const all = items.every((i) => done[i.key]);

  return (
    <Card tone="warn">
      <View style={s.cardHead}>
        <IconTile name="moon" tone="warn" size={40} />
        <Text style={[s.cardTitle, { flex: 1 }]}>It's getting dark</Text>
        {all ? (
          <Animated.View entering={ZoomIn.duration(DUR.quick)}>
            <Pill tone="accent" icon="check">Ready</Pill>
          </Animated.View>
        ) : null}
      </View>
      <View style={{ gap: 4, marginTop: 10 }}>
        {items.map((i) => {
          const on = !!done[i.key];
          return (
            <Press
              key={i.key}
              feel="tap"
              scaleTo={0.985}
              onPress={() => setDone((d) => ({ ...d, [i.key]: !d[i.key] }))}
              accessibilityRole="checkbox"
              accessibilityLabel={i.text}
              style={s.checkRow}
            >
              <View
                style={[
                  s.checkBox,
                  { borderColor: on ? t.accentFill : t.warn, backgroundColor: on ? t.accentFill : "transparent" },
                ]}
              >
                {on ? (
                  <Animated.View entering={ZoomIn.duration(DUR.quick)}>
                    <Icon name="check" size={16} color={t.accentInk} strokeWidth={3} />
                  </Animated.View>
                ) : null}
              </View>
              <Text style={[s.checkText, on && { color: t.text2 }]}>{i.text}</Text>
            </Press>
          );
        })}
      </View>
      {LOCAL.lightsAtNight ? (
        <Txt role="small" style={{ marginTop: 8 }}>
          Lights are required by law after dark.
        </Txt>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------ level and badges -- */

function LevelCard({ rides }) {
  const [s, t] = useStyles();
  const lv = useMemo(() => riderLevel(rides), [rides]);
  return (
    <Card>
      <View style={s.levelRow}>
        <LevelMedal level={lv.level} index={lv.index} size={76} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt role="label">Level {lv.index + 1}</Txt>
          <Text style={s.levelName}>{lv.level.name}</Text>
          <Txt role="small">
            {lv.next
              ? `${lv.toNextKm.toFixed(lv.toNextKm < 10 ? 1 : 0)} km to ${lv.next.name}`
              : "Top level. Legendary."}
          </Txt>
        </View>
      </View>
      <ProgressBar fraction={lv.fraction} colors={lv.next ? lv.next.colors : lv.level.colors} height={12} style={{ marginTop: 16 }} />
      <View style={s.levelEnds}>
        <Txt role="small">{Math.round(lv.km)} km ridden</Txt>
        {lv.next ? <Txt role="small">{lv.next.km} km</Txt> : null}
      </View>
    </Card>
  );
}

function BadgeRow({ rides, goalKm }) {
  const [s, t] = useStyles();
  const list = useMemo(() => badges(rides, { goalKm }), [rides, goalKm]);
  const colorOf = (key) => MEDAL_COLORS[BADGES.findIndex((b) => b.key === key) % MEDAL_COLORS.length];
  const earned = list.filter((b) => b.earned).length;

  return (
    <View>
      <SectionTitle right={<Txt role="small">{earned} of {list.length}</Txt>}>Badges</SectionTitle>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 18 }}
        style={{ marginHorizontal: -18 }}
      >
        {list.map((b, i) => (
          <Animated.View key={b.key} entering={FadeInDown.delay(200 + Math.min(i, 6) * 50).duration(DUR.base)} style={s.badge}>
            <Medal icon={b.icon} colors={colorOf(b.key)} earned={b.earned} size={62} label={b.name} />
            <Text style={[s.badgeName, !b.earned && { color: t.text3 }]} numberOfLines={1}>{b.name}</Text>
            {b.earned ? (
              <Text style={s.badgeHow} numberOfLines={2}>{b.how}</Text>
            ) : (
              <>
                <Text style={s.badgeHow} numberOfLines={2}>{b.how}</Text>
                <ProgressBar fraction={b.progress} height={5} style={{ alignSelf: "stretch", marginTop: 6 }} />
              </>
            )}
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

/* ----------------------------------------------------------- health card -- */

function HealthCard({ rides, preset }) {
  const [s, t] = useStyles();
  const health = useMemo(() => healthFor(rides), [rides]);
  const cold = useMemo(() => coldInsight(rides.filter(isEnergySample)), [rides]);
  const basis = health?.mode ? `Compared on your ${modeLabel(preset, health.mode)} rides.` : null;

  if (!health) {
    return (
      <Card>
        <View style={s.cardHead}>
          <IconTile name="battery" tone="aqua" />
          <Text style={s.cardTitle}>Real range</Text>
        </View>
        <Txt style={{ marginTop: 10 }}>
          Set your battery before and after a ride that uses at least 10%, and Rangely works out
          how far your scooter really goes on a full charge.
        </Txt>
      </Card>
    );
  }

  const { current, baseline } = health;

  if (!baseline) {
    const judged = health.totalPct / (health.totalPct + health.needPct);
    const charges = Math.max(1, Math.ceil(health.needPct / 100));
    return (
      <Card>
        <View style={s.cardHead}>
          <IconTile name="battery" tone="aqua" />
          <Text style={[s.cardTitle, { flex: 1 }]}>Real range</Text>
          <Pill tone="aqua">{plural(health.samples, "ride")}</Pill>
        </View>
        <View style={s.bigRow}>
          <CountUp value={current.rangeKm} format={(v) => v.toFixed(0)} style={s.bigValue} />
          <Text style={s.bigUnit}>km</Text>
        </View>
        <Txt role="small">
          on a full charge · {current.kmPerPct.toFixed(2)} km per 1%
        </Txt>
        <View style={s.divider} />
        <Txt role="strong">Battery health</Txt>
        <Txt role="small" style={{ marginTop: 2, marginBottom: 10 }}>
          Unlocks after about {plural(charges, "more full charge")} of riding.
        </Txt>
        <ProgressBar fraction={judged} />
        <ColdNote cold={cold} />
      </Card>
    );
  }

  const band = BANDS[health.band] ?? BANDS.normal;
  return (
    <Card>
      <View style={s.cardHead}>
        <IconTile name="battery" tone="aqua" />
        <Text style={[s.cardTitle, { flex: 1 }]}>Battery health</Text>
        <Pill tone={band.tone} icon={band.tone === "accent" ? "check" : "warning"}>
          {band.label}
        </Pill>
      </View>
      <View style={s.bigRow}>
        <CountUp value={health.healthRounded} format={(v) => v.toFixed(0)} style={s.bigValue} />
        <Text style={s.bigUnit}>%</Text>
      </View>
      <Txt role="small">
        Range now {Math.round(current.rangeKm)} km · was {Math.round(baseline.rangeKm)} km
      </Txt>
      <Sparkline values={health.trend.map((p) => p.rangeKm)} />
      {basis ? (
        <Txt role="small" style={{ marginTop: 10 }}>
          {basis} Sport uses more battery than Eco, so mixing them would look like wear.
        </Txt>
      ) : null}
      <ColdNote cold={cold} />
    </Card>
  );
}

/** Cold rides against warm ones, when there are enough of both: so a lower
 *  winter range reads as the weather, not as a worn pack. */
function ColdNote({ cold }) {
  const [s, t] = useStyles();
  if (!cold) return null;
  return (
    <View style={[s.insight, { backgroundColor: t.aquaWash }]}>
      <Icon name="temp" size={16} color={t.aqua} />
      <Text style={s.insightText}>
        Below {cold.coldBelow}° your battery goes {Math.round(cold.lossPct)}% less far than above {cold.warmFrom}°.
        That's the cold, not wear — it comes back when it warms up.
      </Text>
    </View>
  );
}

/* ------------------------------------------------------ range by mode -- */

/**
 * How far a full charge goes in each mode, from the rider's own rides — the
 * question "is Race worth it?" answered in kilometres.
 */
function ModeRangeCard({ rides, preset }) {
  const [s, t] = useStyles();
  const stats = useMemo(() => modeStats(rides), [rides]);
  const insight = useMemo(() => modeInsight(stats), [stats]);
  if (!stats.length) return null;
  const max = Math.max(...stats.map((m) => m.rangeKm));

  return (
    <Card style={{ marginTop: 12 }}>
      <View style={s.cardHead}>
        <IconTile name="speed" tone="grad" />
        <Text style={[s.cardTitle, { flex: 1 }]}>Range by mode</Text>
      </View>
      <View style={{ gap: 12, marginTop: 14 }}>
        {stats.map((m) => (
          <View key={m.mode} accessibilityLabel={`${modeLabel(preset, m.mode)}: ${Math.round(m.rangeKm)} kilometres on a full charge`}>
            <View style={s.modeLine}>
              <Text style={s.modeName}>{modeLabel(preset, m.mode)}</Text>
              <Text style={s.modeRange}>
                {Math.round(m.rangeKm)}
                <Text style={s.modeUnit}> km</Text>
              </Text>
            </View>
            <View style={[s.modeTrack, { backgroundColor: t.surface2 }]}>
              <View style={[s.modeBar, { width: `${Math.max(8, (m.rangeKm / max) * 100)}%` }]}>
                <GradientFill colors={MODES[m.mode].colors} dir="across" />
              </View>
            </View>
            <Txt role="small" style={{ marginTop: 3 }}>
              {m.kmPerPct.toFixed(2)} km per 1% · {plural(m.rides, "ride")}
            </Txt>
          </View>
        ))}
      </View>
      {insight ? (
        <View style={[s.insight, { backgroundColor: t.warnWash }]}>
          <Icon name="bolt" size={16} color={t.warn} />
          <Text style={s.insightText}>
            {modeLabel(preset, insight.worst.mode)} uses {Math.round(insight.extraPct)}% more battery per km than{" "}
            {modeLabel(preset, insight.best.mode)}.
          </Text>
        </View>
      ) : (
        <Txt role="small" style={{ marginTop: 12 }}>
          Measure a ride in another mode to see how much more battery it takes.
        </Txt>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------- last ride -- */

function LastRide({ ride, onOpen, now }) {
  const [s, t] = useStyles();
  return (
    <Press onPress={() => onOpen(ride)} scaleTo={0.98} style={s.lastCard} accessibilityLabel="Open last ride">
      {ride.track?.length > 1 ? (
        <RouteShape track={ride.track} height={76} style={{ width: 76 }} thick={2.4} />
      ) : (
        <View style={[s.noRoute, { backgroundColor: t.surface2 }]}>
          <Icon name="route" size={22} color={t.text3} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Txt role="small">
          {dayLabel(ride.startedAt, now)} · {timeLabel(ride.startedAt)}
        </Txt>
        <Text style={s.lastKm}>
          {(ride.distance / 1000).toFixed(1)}
          <Text style={s.lastUnit}> km</Text>
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Txt role="small">{fmtDuration(ride.movingTime)} moving</Txt>
          <WeatherChip weather={ride.weather} />
        </View>
      </View>
      <Icon name="chevron" size={20} color={t.text3} />
    </Press>
  );
}

/* ------------------------------------------------------------------ home -- */

export function HomeScreen({
  rides, scooter, profile, battery, onBattery, onStart, starting, canBackground,
  onOpenRide, onSeeAll, onOpenScooter, preset, mode, onMode, dual, onDual, here,
}) {
  const [s, t] = useStyles();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const now = useNow(60000);
  const dark = isAfterDark(now);
  const last = rides[0];
  let i = 0;

  // Where the last ride left the battery, offered as a one-tap answer —
  // most rides start where the previous one ended.
  const suggestions = useMemo(() => {
    const out = [{ label: "Full", value: 100 }];
    const end = last?.battery?.end;
    if (Number.isFinite(end) && end < 100) out.push({ label: "Last ride", value: end });
    return out;
  }, [last]);

  // The status bar sits over the dark hero; once the hero scrolls away, a
  // strip of the same dark fades in behind it so its icons stay readable.
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const strip = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [120, 200], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 130 + kb }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enter(i++)}>
          <Hero rides={rides} profile={profile} scooter={scooter} now={now} onOpenScooter={onOpenScooter} />
        </Animated.View>

        <View style={s.body}>
          <Animated.View entering={enter(i++)}>
            <SectionTitle>Before you ride</SectionTitle>
            <Card>
              <BatteryField
                label="Battery now"
                value={battery}
                onChange={onBattery}
                display={scooter.display}
                suggestions={suggestions}
                hint="Optional — set it again at the end to measure your real range."
              />
              <View style={s.divider} />
              <Txt role="strong" style={{ marginBottom: 10 }}>Riding mode</Txt>
              <ModePicker preset={preset} value={mode} onChange={onMode} dual={dual} onDual={onDual} />
            </Card>
            <RangeCard
              rides={rides}
              preset={preset}
              mode={mode}
              dual={dual}
              packWh={Number(scooter.packWh)}
              battery={battery}
              here={here}
            />
          </Animated.View>

          {/* After dark, a quick check before setting off: lights, something
              bright, a helmet. Three taps, and it says "Ready". */}
          {dark ? (
            <Animated.View entering={enter(i++)} style={{ marginTop: 12 }}>
              <NightCheck ageBracket={profile.ageBracket} />
            </Animated.View>
          ) : null}

          <Animated.View entering={enter(i++)}>
            <SectionTitle>Your level</SectionTitle>
            <LevelCard rides={rides} />
          </Animated.View>

          <Animated.View entering={enter(i++)}>
            <BadgeRow rides={rides} goalKm={profile.goalKm} />
          </Animated.View>

          <Animated.View entering={enter(i++)}>
            <SectionTitle>Your battery</SectionTitle>
            <HealthCard rides={rides} preset={preset} />
            <ModeRangeCard rides={rides} preset={preset} />
          </Animated.View>

          {last ? (
            <Animated.View entering={enter(i++)}>
              <SectionTitle
                right={
                  <Press onPress={onSeeAll} hitSlop={12} accessibilityLabel="See all rides">
                    <Text style={s.link}>See all</Text>
                  </Press>
                }
              >
                Last ride
              </SectionTitle>
              <LastRide ride={last} onOpen={onOpenRide} now={now} />
            </Animated.View>
          ) : null}
        </View>
      </Animated.ScrollView>

      <Animated.View pointerEvents="none" style={[s.strip, { height: insets.top, backgroundColor: t.hero[1] }, strip]} />

      {/* The one action that matters, always under the thumb. A fade above it
          so the cards slide under instead of being cut off by a hard edge. */}
      <View style={s.dock} pointerEvents="box-none">
        <Svg height={32} width="100%" style={s.fade} pointerEvents="none">
          <Defs>
            <LinearGradient id="dockfade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.bg} stopOpacity="0" />
              <Stop offset="1" stopColor={t.bg} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="32" fill="url(#dockfade)" />
        </Svg>
        <View style={[s.dockInner, { backgroundColor: t.bg }]}>
          <Button
            title={starting ? "Finding GPS…" : "Start ride"}
            icon="play"
            size="big"
            feel="medium"
            disabled={starting}
            onPress={onStart}
          />
          <Press onPress={canBackground ? undefined : onOpenScooter} disabled={canBackground} style={s.modeRow}>
            <Icon name={canBackground ? "check" : "light"} size={13} color={canBackground ? t.accent : t.text3} />
            <Text style={s.modeText}>
              {canBackground
                ? "Keeps recording with the screen off"
                : "Screen stays on while you ride · change"}
            </Text>
          </Press>
        </View>
      </View>
    </View>
  );
}

const useStyles = themed((t) =>
  StyleSheet.create({
    body: { paddingHorizontal: 18 },

    hero: { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, paddingHorizontal: 20, paddingBottom: 20 },
    heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    hello: { fontFamily: F.medium, fontSize: 14, color: t.onHero2 },
    brand: { fontFamily: F.heavy, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: t.onHero },
    scooterChip: {
      flexDirection: "row", alignItems: "center", gap: 7, maxWidth: 170,
      backgroundColor: t.heroFill, borderColor: t.heroLine, borderWidth: 1,
      borderRadius: t.pill, paddingHorizontal: 14, height: 40,
    },
    scooterName: { fontFamily: F.bold, fontSize: 14, color: t.onHero, flexShrink: 1 },
    chipPhoto: { width: 28, height: 28, borderRadius: 14, marginLeft: -8, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)" },

    goalRow: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 20 },
    ringValue: { ...TYPE.big, fontSize: 46, lineHeight: 46, color: t.onHero },
    ringUnit: { fontFamily: F.semi, fontSize: 12, color: t.onHero3 },
    heroLabel: { ...TYPE.label, color: t.onHero3 },
    goalHead: { ...TYPE.title, fontSize: 27, lineHeight: 31, color: t.onHero },
    heroSmall: { fontFamily: F.medium, fontSize: 13.5, color: t.onHero2 },

    weeks: { flexDirection: "row", gap: 8, marginTop: 20 },
    weekCol: { flex: 1, alignItems: "center", gap: 6 },
    weekTrack: { width: "100%", justifyContent: "flex-end", alignItems: "center" },
    goalLine: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.22)" },
    weekBar: { width: "58%", borderRadius: 6 },
    weekLabel: { fontFamily: F.semi, fontSize: 11, color: t.onHero3 },

    cardTitle: { ...TYPE.heading, color: t.text },
    cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    checkRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
    checkBox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
    checkText: { ...TYPE.bodyStrong, color: t.text, flex: 1 },

    levelRow: { flexDirection: "row", alignItems: "center", gap: 16 },
    levelName: { ...TYPE.title, fontSize: 26, lineHeight: 30, color: t.text },
    levelEnds: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },

    badge: {
      width: 124, alignItems: "center", paddingVertical: 14, paddingHorizontal: 10,
      backgroundColor: t.surface, borderRadius: t.radiusSm,
      borderWidth: t.scheme === "light" ? 0 : 1, borderColor: t.line, boxShadow: t.cardShadow,
    },
    badgeName: { fontFamily: F.bold, fontSize: 14, color: t.text, marginTop: 8 },
    badgeHow: { fontFamily: F.medium, fontSize: 11.5, lineHeight: 15, color: t.text3, textAlign: "center", marginTop: 2 },

    bigRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 12 },
    bigValue: { ...TYPE.display, color: t.text },
    bigUnit: { fontFamily: F.num, fontSize: 26, color: t.text3 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.line, marginVertical: 16 },

    modeLine: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 },
    modeName: { fontFamily: F.bold, fontSize: 15, color: t.text },
    modeRange: { ...TYPE.value, fontSize: 26, lineHeight: 28, color: t.text },
    modeUnit: { fontFamily: F.bold, fontSize: 13, color: t.text3 },
    modeTrack: { height: 12, borderRadius: 6, overflow: "hidden" },
    modeBar: { height: "100%", borderRadius: 6, overflow: "hidden" },
    insight: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 14, padding: 12, marginTop: 14 },
    insightText: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: t.text, flex: 1 },

    link: { fontFamily: F.heavy, fontSize: 14, color: t.accent },
    lastCard: {
      flexDirection: "row", alignItems: "center", gap: 14,
      backgroundColor: t.surface, borderRadius: t.radius, padding: 12,
      borderWidth: t.scheme === "light" ? 0 : 1, borderColor: t.line, boxShadow: t.cardShadow,
    },
    noRoute: { width: 76, height: 76, borderRadius: t.radiusSm, alignItems: "center", justifyContent: "center" },
    lastKm: { ...TYPE.value, color: t.text, marginVertical: 1 },
    lastUnit: { fontFamily: F.bold, fontSize: 14, color: t.text3 },

    strip: { position: "absolute", top: 0, left: 0, right: 0 },
    dock: { position: "absolute", left: 0, right: 0, bottom: 0 },
    fade: { position: "absolute", top: -32, left: 0 },
    dockInner: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
    modeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 8, minHeight: 28 },
    modeText: { fontFamily: F.semi, fontSize: 13, color: t.text3 },
  }),
);
