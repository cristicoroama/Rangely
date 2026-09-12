import { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Alert,
} from "react-native";

import { T } from "./src/theme";
import { Button, Card, Pill, SectionTitle, Sparkline, Stat } from "./src/ui";
import { useRideTracker } from "./src/useRideTracker";
import {
  avgSpeed, energyStats, fmtDistance, fmtDuration, msToKmh, packHealth, streakDays, totals,
} from "./src/ride";
import { deleteRide, loadRides, loadScooter, saveRide, saveScooter } from "./src/storage";

/** Under fifty metres there is no ride, only GPS drift — saving it would
 *  pollute the history and every lifetime total built on it. */
const MIN_RIDE_M = 50;

/** Battery percentage, asked before and after a ride.
 *
 *  Two typed numbers are all it takes to turn a GPS track into Wh/km, which is
 *  the thing no other tracker will tell you. Optional on purpose: a rider who
 *  skips it still gets a recorded ride, just without the energy half. */
function BatteryInput({ label, value, onChange }) {
  return (
    <View style={s.batteryRow}>
      <Text style={s.batteryLabel}>{label}</Text>
      <TextInput
        style={s.batteryField}
        value={value}
        // Clamped as it is typed: a gauge cannot read 150%, and a stray digit
        // would otherwise be carried all the way into a range figure.
        onChangeText={(v) => {
          const digits = v.replace(/[^0-9]/g, "").slice(0, 3);
          onChange(digits && Number(digits) > 100 ? "100" : digits);
        }}
        keyboardType="number-pad"
        placeholder="—"
        placeholderTextColor={T.dim}
        maxLength={3}
      />
      <Text style={s.batteryPct}>%</Text>
    </View>
  );
}

export default function App() {
  const { state, tracking, mode, error, start, stop, reset } = useRideTracker();
  const [rides, setRides] = useState([]);
  const [scooter, setScooter] = useState({ name: "My scooter", packWh: 500 });
  const [batteryStart, setBatteryStart] = useState("");
  const [batteryEnd, setBatteryEnd] = useState("");
  // A ride that has stopped but is not written down yet. It exists because the
  // end-of-ride battery reading can only be typed AFTER the ride, and saving
  // on the stop button meant that number arrived too late every single time —
  // the energy half of the app, unreachable in normal use.
  const [pending, setPending] = useState(null);

  useEffect(() => {
    loadRides().then(setRides);
    loadScooter().then(setScooter);
  }, []);

  const agg = useMemo(() => totals(rides), [rides]);
  const health = useMemo(() => packHealth(rides), [rides]);
  const streak = useMemo(() => streakDays(rides), [rides]);

  const shown = pending ?? state;
  const kmh = msToKmh(avgSpeed(shown));
  const top = msToKmh(shown.topSpeed);

  const packWh = Number(scooter.packWh);
  const pendingEnergy = useMemo(
    () =>
      pending
        ? energyStats({ batteryStart, batteryEnd, packWh, distanceM: pending.distance })
        : null,
    [pending, batteryStart, batteryEnd, packWh],
  );

  async function onStart() {
    const { ok, error: why } = await start();
    if (!ok) Alert.alert("Cannot start", why || "Location unavailable.");
  }

  function onStop() {
    const finished = stop();

    if (finished.distance < MIN_RIDE_M) {
      Alert.alert("Ride too short", "Nothing was recorded — you barely moved.");
      reset();
      return;
    }
    setPending(finished);
  }

  async function onSave() {
    const ride = {
      id: String(pending.startedAt ?? Date.now()),
      startedAt: pending.startedAt,
      distance: pending.distance,
      movingTime: pending.movingTime,
      elapsed: pending.elapsed,
      topSpeed: pending.topSpeed,
      ascent: pending.ascent,
      gaps: pending.gaps,
      // The route is already thinned as it is recorded, so it is stored as it
      // stands — shape enough to draw, small enough to keep.
      track: pending.track,
      scooter: scooter.name,
      energy: pendingEnergy,
    };

    setRides(await saveRide(ride));
    setPending(null);
    reset();
    setBatteryStart("");
    setBatteryEnd("");
  }

  function onDiscard() {
    Alert.alert("Discard this ride?", "It will not be saved.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          setPending(null);
          reset();
          setBatteryEnd("");
        },
      },
    ]);
  }

  function confirmDelete(id) {
    Alert.alert("Delete ride?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => setRides(await deleteRide(id)),
      },
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.head}>
          <Text style={s.brand}>
            Range<Text style={{ color: T.accent }}>ly</Text>
          </Text>
          {tracking && (
            <Pill tone="accent">
              {mode === "background" ? "recording · background" : "recording · screen on"}
            </Pill>
          )}
        </View>

        <Card style={tracking && s.liveCard}>
          <View style={s.statsRow}>
            <Stat big label="Distance" value={fmtDistance(shown.distance).split(" ")[0]}
                  unit={fmtDistance(shown.distance).split(" ")[1]} />
          </View>
          <View style={[s.statsRow, { marginTop: 18 }]}>
            <Stat label="Moving" value={fmtDuration(shown.movingTime)} />
            <Stat label="Avg" value={kmh.toFixed(1)} unit="km/h" />
            <Stat label="Top" value={top.toFixed(1)} unit="km/h" />
          </View>
          {shown.elapsed > 0 && (
            <Text style={s.elapsedNote}>
              {fmtDuration(shown.elapsed)} elapsed · {fmtDuration(shown.elapsed - shown.movingTime)} stopped
              {shown.ascent >= 1 ? ` · ${Math.round(shown.ascent)} m climbed` : ""}
            </Text>
          )}
          {shown.gaps > 0 && (
            // Said out loud rather than hidden: the distance is short by
            // whatever happened in those holes, and a number you cannot
            // question is worse than one you can.
            <Text style={s.warn}>
              {shown.gaps} gap{shown.gaps > 1 ? "s" : ""} in the signal — distance excludes them.
            </Text>
          )}
        </Card>

        {pending ? (
          <Card style={{ marginTop: 12 }}>
            <Text style={s.finishTitle}>Finish this ride</Text>
            <BatteryInput label="Battery at start" value={batteryStart} onChange={setBatteryStart} />
            <BatteryInput label="Battery at end" value={batteryEnd} onChange={setBatteryEnd} />
            {pendingEnergy ? (
              <View style={[s.statsRow, { marginTop: 8 }]}>
                <Stat label="Used" value={pendingEnergy.wh.toFixed(0)} unit="Wh" />
                <Stat label="Efficiency" value={pendingEnergy.whPerKm.toFixed(1)} unit="Wh/km" />
                <Stat label="Real range" value={pendingEnergy.estimatedRangeKm.toFixed(0)} unit="km" />
              </View>
            ) : (
              <Text style={s.hint}>
                Fill both readings for Wh/km and your measured range. Skip them and the
                ride is still saved, just without the energy half.
              </Text>
            )}
            <View style={{ marginTop: 16 }}>
              <Button title="SAVE RIDE" onPress={onSave} />
            </View>
            <View style={{ marginTop: 8 }}>
              <Button title="Discard" tone="ghost" onPress={onDiscard} />
            </View>
          </Card>
        ) : (
          !tracking && (
            <Card style={{ marginTop: 12 }}>
              <BatteryInput label="Battery at start" value={batteryStart} onChange={setBatteryStart} />
              <Text style={s.hint}>
                Optional, and you can still type it afterwards. With your pack size
                ({scooter.packWh} Wh) this and the reading at the end give real Wh/km
                and your measured range.
              </Text>
            </Card>
          )
        )}

        {!pending && (
          <View style={{ marginTop: 14 }}>
            {tracking ? (
              <Button title="STOP RIDE" tone="danger" onPress={onStop} />
            ) : (
              <Button title="START RIDE" onPress={onStart} />
            )}
          </View>
        )}
        {tracking && mode === "foreground" && (
          <Text style={s.hint}>
            Keep the app open — this build records only while the screen is on.
          </Text>
        )}
        {!!error && <Text style={s.error}>{error}</Text>}

        {health && (
          <>
            <SectionTitle right={<Text style={s.count}>{health.samples} rides</Text>}>
              Pack health
            </SectionTitle>
            <Card>
              <View style={s.statsRow}>
                <Stat label="Range now" value={health.current.rangeKm.toFixed(0)} unit="km" />
                <Stat label="At the start" value={health.baseline.rangeKm.toFixed(0)} unit="km" />
                <Stat
                  label={health.fadePct == null ? "Fade" : health.fadePct >= 0 ? "Faded" : "Gained"}
                  value={health.fadePct == null ? "—" : `${Math.abs(health.fadePct).toFixed(0)}%`}
                />
              </View>
              <Sparkline values={health.trend.map((p) => p.rangeKm)} />
              <Text style={s.hint}>
                {health.fadePct == null
                  ? "Measured range per ride, oldest to newest. A few more rides and this starts comparing now against when you began."
                  : "Measured range per ride, oldest to newest — the median of your first rides against the median of your last."}
              </Text>
            </Card>
          </>
        )}

        {rides.length > 0 && (
          <>
            <SectionTitle right={streak > 1 ? <Text style={s.count}>{streak}-day streak</Text> : null}>
              Lifetime
            </SectionTitle>
            <Card>
              <View style={s.statsRow}>
                <Stat label="Rides" value={String(agg.rides)} />
                <Stat label="Distance" value={(agg.distance / 1000).toFixed(1)} unit="km" />
                <Stat label="Moving" value={fmtDuration(agg.movingTime)} />
              </View>
              {(agg.wh > 0 || agg.ascent >= 1) && (
                <View style={[s.statsRow, { marginTop: 16 }]}>
                  {agg.wh > 0 && <Stat label="Energy" value={agg.wh.toFixed(0)} unit="Wh" />}
                  {agg.wh > 0 && agg.distance > 0 && (
                    <Stat label="Average" value={(agg.wh / (agg.distance / 1000)).toFixed(1)} unit="Wh/km" />
                  )}
                  {agg.ascent >= 1 && (
                    <Stat label="Climbed" value={Math.round(agg.ascent).toString()} unit="m" />
                  )}
                </View>
              )}
            </Card>
          </>
        )}

        <SectionTitle right={rides.length ? <Text style={s.count}>{rides.length}</Text> : null}>
          Rides
        </SectionTitle>
        {rides.length === 0 ? (
          <Card>
            <Text style={s.empty}>No rides yet. Press start and go for a spin.</Text>
          </Card>
        ) : (
          rides.map((r) => (
            <Card key={r.id} style={{ marginBottom: 10 }}>
              <View style={s.rideHead}>
                <Text style={s.rideDate}>
                  {Number.isFinite(r.startedAt) ? new Date(r.startedAt).toLocaleString() : "Ride"}
                </Text>
                <Text style={s.del} onPress={() => confirmDelete(r.id)}>Delete</Text>
              </View>
              <View style={s.statsRow}>
                <Stat label="Distance" value={(r.distance / 1000).toFixed(2)} unit="km" />
                <Stat label="Moving" value={fmtDuration(r.movingTime)} />
                <Stat label="Avg" value={(msToKmh(r.distance / Math.max(r.movingTime, 1))).toFixed(1)} unit="km/h" />
              </View>
              {r.energy && Number.isFinite(r.energy.estimatedRangeKm) && (
                <View style={[s.statsRow, { marginTop: 14 }]}>
                  <Stat label="Used" value={r.energy.wh.toFixed(0)} unit="Wh" />
                  <Stat label="Efficiency" value={r.energy.whPerKm.toFixed(1)} unit="Wh/km" />
                  <Stat label="Real range" value={r.energy.estimatedRangeKm.toFixed(0)} unit="km" />
                </View>
              )}
            </Card>
          ))
        )}

        <SectionTitle>Scooter</SectionTitle>
        <Card style={{ marginBottom: 40 }}>
          <View style={s.batteryRow}>
            <Text style={s.batteryLabel}>Battery pack</Text>
            <TextInput
              style={s.batteryField}
              value={String(scooter.packWh)}
              onChangeText={(v) => {
                const next = { ...scooter, packWh: Number(v.replace(/[^0-9]/g, "")) || 0 };
                setScooter(next);
                saveScooter(next);
              }}
              keyboardType="number-pad"
              maxLength={5}
            />
            <Text style={s.batteryPct}>Wh</Text>
          </View>
          <Text style={s.hint}>
            Usually printed on the deck or in the manual — e.g. 36V × 10.4Ah ≈ 374 Wh.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  scroll: { padding: T.pad, paddingTop: 8 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  brand: { color: T.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  liveCard: { borderColor: T.accentDim },
  statsRow: { flexDirection: "row", gap: 12 },
  elapsedNote: { color: T.dim, fontSize: 11, marginTop: 14 },
  finishTitle: { color: T.text, fontSize: 15, fontWeight: "800", marginBottom: 14 },
  hint: { color: T.dim, fontSize: 11, marginTop: 10, lineHeight: 16 },
  warn: { color: T.accent, fontSize: 11, marginTop: 8 },
  error: { color: T.danger, fontSize: 13, marginTop: 10 },
  empty: { color: T.dim, fontSize: 13, lineHeight: 19 },
  rideHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  rideDate: { color: T.dim, fontSize: 12 },
  del: { color: T.danger, fontSize: 12, fontWeight: "700" },
  count: { color: T.dim, fontSize: 12 },
  batteryRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  batteryLabel: { color: T.text, fontSize: 14, flex: 1 },
  batteryField: {
    backgroundColor: T.cardHi, borderColor: T.border, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    color: T.text, fontSize: 16, fontWeight: "700", minWidth: 74, textAlign: "right",
  },
  batteryPct: { color: T.dim, fontSize: 13, width: 24 },
});
