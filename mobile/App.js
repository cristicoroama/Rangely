import { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Alert,
} from "react-native";

import { T } from "./src/theme";
import { Button, Card, SectionTitle, Stat } from "./src/ui";
import { useRideTracker } from "./src/useRideTracker";
import { avgSpeed, energyStats, fmtDistance, fmtDuration, msToKmh } from "./src/ride";
import { deleteRide, loadRides, loadScooter, saveRide, saveScooter, totals } from "./src/storage";

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
        onChangeText={(v) => onChange(v.replace(/[^0-9]/g, "").slice(0, 3))}
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
  const { state, tracking, error, start, stop, reset } = useRideTracker();
  const [rides, setRides] = useState([]);
  const [scooter, setScooter] = useState({ name: "My scooter", packWh: 500 });
  const [batteryStart, setBatteryStart] = useState("");
  const [batteryEnd, setBatteryEnd] = useState("");

  useEffect(() => {
    loadRides().then(setRides);
    loadScooter().then(setScooter);
  }, []);

  const agg = useMemo(() => totals(rides), [rides]);
  const kmh = msToKmh(avgSpeed(state));
  const top = msToKmh(state.topSpeed);

  async function onStart() {
    const ok = await start();
    if (!ok) Alert.alert("Cannot start", error || "Location unavailable.");
  }

  async function onStop() {
    const finished = stop();

    if (finished.distance < 50) {
      // Under fifty metres there is no ride, only GPS drift — saving it would
      // pollute the history and every lifetime total built on it.
      Alert.alert("Ride too short", "Nothing was recorded — you barely moved.");
      reset();
      return;
    }

    const energy = energyStats({
      batteryStart: Number(batteryStart),
      batteryEnd: Number(batteryEnd),
      packWh: Number(scooter.packWh),
      distanceM: finished.distance,
    });

    const ride = {
      id: String(finished.startedAt ?? Date.now()),
      startedAt: finished.startedAt,
      distance: finished.distance,
      movingTime: finished.movingTime,
      elapsed: finished.elapsed,
      topSpeed: finished.topSpeed,
      ascent: finished.ascent,
      // Only the shape of the route is kept, not every fix — the full track is
      // thousands of points per ride and nothing in the app reads them yet.
      points: finished.points.filter((_, i) => i % 5 === 0).map((p) => [p.lat, p.lon]),
      scooter: scooter.name,
      energy,
    };

    setRides(await saveRide(ride));
    reset();
    setBatteryStart("");
    setBatteryEnd("");
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
        <Text style={s.brand}>
          Range<Text style={{ color: T.accent }}>ly</Text>
        </Text>

        <Card style={tracking && s.liveCard}>
          <View style={s.statsRow}>
            <Stat big label="Distance" value={fmtDistance(state.distance).split(" ")[0]}
                  unit={fmtDistance(state.distance).split(" ")[1]} />
          </View>
          <View style={[s.statsRow, { marginTop: 18 }]}>
            <Stat label="Moving" value={fmtDuration(state.movingTime)} />
            <Stat label="Avg" value={kmh.toFixed(1)} unit="km/h" />
            <Stat label="Top" value={top.toFixed(1)} unit="km/h" />
          </View>
          {state.elapsed > 0 && (
            <Text style={s.elapsedNote}>
              {fmtDuration(state.elapsed)} elapsed · {fmtDuration(state.elapsed - state.movingTime)} stopped
            </Text>
          )}
        </Card>

        {!tracking && (
          <Card style={{ marginTop: 12 }}>
            <BatteryInput label="Battery at start" value={batteryStart} onChange={setBatteryStart} />
            <BatteryInput label="Battery at end" value={batteryEnd} onChange={setBatteryEnd} />
            <Text style={s.hint}>
              Optional. With your pack size ({scooter.packWh} Wh) these two numbers
              give real Wh/km and your measured range.
            </Text>
          </Card>
        )}

        <View style={{ marginTop: 14 }}>
          {tracking ? (
            <Button title="STOP RIDE" tone="danger" onPress={onStop} />
          ) : (
            <Button title="START RIDE" onPress={onStart} />
          )}
        </View>
        {tracking && <Text style={s.hint}>Keep the app open — background tracking comes later.</Text>}
        {!!error && <Text style={s.error}>{error}</Text>}

        {rides.length > 0 && (
          <>
            <SectionTitle>Lifetime</SectionTitle>
            <Card>
              <View style={s.statsRow}>
                <Stat label="Rides" value={String(agg.rides)} />
                <Stat label="Distance" value={(agg.distance / 1000).toFixed(1)} unit="km" />
                <Stat label="Moving" value={fmtDuration(agg.movingTime)} />
              </View>
              {agg.wh > 0 && (
                <View style={[s.statsRow, { marginTop: 16 }]}>
                  <Stat label="Energy" value={agg.wh.toFixed(0)} unit="Wh" />
                  <Stat label="Average" value={(agg.wh / (agg.distance / 1000)).toFixed(1)} unit="Wh/km" />
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
                  {new Date(r.startedAt).toLocaleString()}
                </Text>
                <Text style={s.del} onPress={() => confirmDelete(r.id)}>Delete</Text>
              </View>
              <View style={s.statsRow}>
                <Stat label="Distance" value={(r.distance / 1000).toFixed(2)} unit="km" />
                <Stat label="Moving" value={fmtDuration(r.movingTime)} />
                <Stat label="Avg" value={(msToKmh(r.distance / Math.max(r.movingTime, 1))).toFixed(1)} unit="km/h" />
              </View>
              {r.energy && (
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
  brand: { color: T.text, fontSize: 26, fontWeight: "900", marginBottom: 16, letterSpacing: -0.5 },
  liveCard: { borderColor: T.accentDim },
  statsRow: { flexDirection: "row", gap: 12 },
  elapsedNote: { color: T.dim, fontSize: 11, marginTop: 14 },
  hint: { color: T.dim, fontSize: 11, marginTop: 10, lineHeight: 16 },
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
