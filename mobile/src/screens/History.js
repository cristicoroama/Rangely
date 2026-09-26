import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F, TYPE } from "../theme";
import { DUR } from "../motion";
import { Icon, IconTile, Pill, Press, Txt, themed } from "../ui";
import { CountUp } from "../components/CountUp";
import { HeroPanel } from "../components/Gradient";
import { LevelMedal } from "../components/Medal";
import { ModeTag } from "../components/ModePicker";
import { RouteShape } from "../map";
import { avgSpeed, fmtDuration, msToKmh, totals } from "../ride";
import { riderLevel } from "../achievements";
import { dayLabel, timeLabel } from "../when";

/** Only the first screenful is staggered in; anything further down arrives
 *  as it is scrolled to, with no delay to wait through. */
const enter = (i) => FadeInDown.delay(Math.min(i, 8) * 55).duration(DUR.base);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Rides grouped under a month heading with that month's kilometres — the
 *  way you think back over riding ("I did loads in August"). */
function withMonths(rides) {
  const out = [];
  let key = null;
  let head = null;
  for (const r of rides) {
    const d = new Date(r.startedAt || 0);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (k !== key) {
      key = k;
      head = { type: "month", id: `m-${k}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, km: 0, rides: 0 };
      out.push(head);
    }
    head.km += (r.distance || 0) / 1000;
    head.rides += 1;
    out.push({ type: "ride", id: String(r.id), ride: r });
  }
  return out;
}

function RideRow({ ride, index, onOpen }) {
  const [s, t] = useStyles();
  const range = ride.energy?.estimatedRangeKm;
  return (
    <Animated.View entering={enter(index)}>
      <Press
        onPress={() => onOpen(ride)}
        scaleTo={0.98}
        style={s.row}
        accessibilityLabel={`${dayLabel(ride.startedAt)}, ${(ride.distance / 1000).toFixed(1)} kilometres`}
      >
        {ride.track?.length > 1 ? (
          <RouteShape track={ride.track} height={84} thick={2.4} style={{ width: 84 }} />
        ) : (
          <View style={[s.noRoute, { backgroundColor: t.surface2 }]}>
            <Icon name="route" size={24} color={t.text3} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Txt role="small">
            {dayLabel(ride.startedAt)} · {timeLabel(ride.startedAt)}
          </Txt>
          <Text style={s.km}>
            {(ride.distance / 1000).toFixed(1)}
            <Text style={s.unit}> km</Text>
          </Text>
          <Text style={s.meta}>
            {fmtDuration(ride.movingTime)} · {msToKmh(avgSpeed(ride)).toFixed(1)} km/h
          </Text>
          {Number.isFinite(range) || ride.demo || ride.mode ? (
            <View style={s.pills}>
              {ride.mode ? <ModeTag mode={ride.mode} label={ride.modeLabel} /> : null}
              {Number.isFinite(range) ? <Pill tone="aqua" icon="battery">{`~${Math.round(range)} km range`}</Pill> : null}
              {ride.demo ? <Pill>Demo</Pill> : null}
            </View>
          ) : null}
        </View>
        <Icon name="chevron" size={20} color={t.text3} />
      </Press>
    </Animated.View>
  );
}

function Summary({ rides }) {
  const [s, t] = useStyles();
  const all = useMemo(() => totals(rides), [rides]);
  const lv = useMemo(() => riderLevel(rides), [rides]);
  return (
    <HeroPanel style={s.summary}>
      <View style={s.sumTop}>
        <View>
          <Text style={s.sumLabel}>All time</Text>
          <View style={s.sumBig}>
            <CountUp value={all.distance / 1000} format={(v) => v.toFixed(0)} style={s.sumKm} />
            <Text style={s.sumKmUnit}>km</Text>
          </View>
        </View>
        <View style={{ alignItems: "center", gap: 4 }}>
          <LevelMedal level={lv.level} index={lv.index} size={78} />
          <Text style={s.sumLabel}>{lv.level.name}</Text>
        </View>
      </View>
      <View style={s.sumRow}>
        <View style={s.sumItem}>
          <CountUp value={all.rides} format={(v) => v.toFixed(0)} style={s.sumValue} />
          <Text style={s.sumLabel}>Rides</Text>
        </View>
        <View style={s.sumSep} />
        <View style={s.sumItem}>
          <CountUp value={all.movingTime / 3600} format={(v) => v.toFixed(1)} style={s.sumValue} />
          <Text style={s.sumLabel}>Hours</Text>
        </View>
        <View style={s.sumSep} />
        <View style={s.sumItem}>
          <CountUp value={all.ascent} format={(v) => v.toFixed(0)} style={s.sumValue} />
          <Text style={s.sumLabel}>Metres up</Text>
        </View>
      </View>
    </HeroPanel>
  );
}

function Empty() {
  const [s] = useStyles();
  return (
    <Animated.View entering={FadeInDown.duration(DUR.base)} style={s.empty}>
      <IconTile name="scooter" tone="grad" size={96} icon={52} />
      <Text style={s.emptyTitle}>No rides yet</Text>
      <Txt style={{ textAlign: "center" }}>
        Every ride you record shows up here, with its route drawn out.
      </Txt>
    </Animated.View>
  );
}

export function HistoryScreen({ rides, onOpen }) {
  const [s] = useStyles();
  const insets = useSafeAreaInsets();
  const items = useMemo(() => withMonths(rides), [rides]);

  return (
    <FlatList
      data={items}
      keyExtractor={(x) => x.id}
      renderItem={({ item, index }) =>
        item.type === "month" ? (
          <View style={s.month}>
            <IconTile name="calendar" tone="grey" size={30} icon={16} />
            <Text style={s.monthLabel}>{item.label}</Text>
            <Text style={s.monthKm}>{item.km.toFixed(0)} km</Text>
          </View>
        ) : (
          <RideRow ride={item.ride} index={index} onOpen={onOpen} />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        <View>
          <Text style={s.title}>History</Text>
          {rides.length ? <Summary rides={rides} /> : null}
        </View>
      }
      ListEmptyComponent={<Empty />}
      contentContainerStyle={[s.list, { paddingTop: insets.top + 14 }]}
      showsVerticalScrollIndicator={false}
      initialNumToRender={10}
      windowSize={7}
    />
  );
}

const useStyles = themed((t) =>
  StyleSheet.create({
    list: { paddingHorizontal: 18, paddingBottom: 32 },
    title: { ...TYPE.title, fontSize: 34, lineHeight: 40, color: t.text, marginBottom: 14 },
    summary: { padding: 18, marginBottom: 14 },
    sumTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sumBig: { flexDirection: "row", alignItems: "baseline", gap: 6 },
    sumKm: { ...TYPE.display, fontSize: 64, lineHeight: 64, color: t.onHero },
    sumKmUnit: { fontFamily: F.num, fontSize: 24, color: t.onHero3 },
    sumRow: {
      flexDirection: "row", marginTop: 14, paddingVertical: 12, borderRadius: t.radiusSm,
      backgroundColor: t.heroFill, borderWidth: 1, borderColor: t.heroLine,
    },
    sumItem: { flex: 1, alignItems: "center", gap: 2 },
    sumSep: { width: 1, backgroundColor: t.heroLine, marginVertical: 4 },
    sumValue: { ...TYPE.value, fontSize: 28, lineHeight: 30, color: t.onHero },
    sumLabel: { ...TYPE.label, color: t.onHero3 },
    month: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 2 },
    monthLabel: { ...TYPE.heading, fontSize: 17, color: t.text, flex: 1 },
    monthKm: { fontFamily: F.num, fontSize: 20, color: t.text2, fontVariant: ["tabular-nums"] },
    row: {
      flexDirection: "row", alignItems: "center", gap: 14,
      backgroundColor: t.surface, borderRadius: t.radius, padding: 12,
      borderWidth: t.scheme === "light" ? 0 : 1, borderColor: t.line, boxShadow: t.cardShadow,
    },
    noRoute: { width: 84, height: 84, borderRadius: t.radiusSm, alignItems: "center", justifyContent: "center" },
    km: { ...TYPE.value, color: t.text },
    unit: { fontFamily: F.bold, fontSize: 14, color: t.text3 },
    meta: { fontFamily: F.semi, fontSize: 14, color: t.text2, fontVariant: ["tabular-nums"] },
    pills: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
    empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24, gap: 10 },
    emptyTitle: { ...TYPE.heading, color: t.text, marginTop: 10 },
  }),
);
