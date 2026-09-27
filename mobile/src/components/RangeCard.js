import { useMemo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { F, TYPE } from "../theme";
import { DUR } from "../motion";
import { Button, Card, Icon, IconTile, Txt, themed } from "../ui";
import { WeatherChip } from "./Weather";
import { RangeMap } from "../map";
import { parsePercent } from "../ride";
import { modeLabel } from "../modes";
import { MARGIN, RESERVE_PCT, basisLine, rangeBasis, thereAndBack } from "../range";
import { roadWarning } from "../weather";

/**
 * "Can I get there and back?" — before the ride, from the battery set above,
 * the rider's own km per 1% in the mode they picked, and the temperature
 * outside. A number to plan with, and the same number drawn as a circle
 * round where they are standing.
 */
export function RangeCard({ rides, preset, mode, dual, packWh, battery, here }) {
  const [s, t] = useStyles();
  const pct = parsePercent(battery);
  const basis = useMemo(() => rangeBasis(rides, { mode, packWh, dual }), [rides, mode, packWh, dual]);
  const r = useMemo(
    () => thereAndBack(pct, basis, { tempNow: here?.weather?.tempC }),
    [pct, basis, here?.weather?.tempC],
  );
  const warn = roadWarning(here?.weather);
  const leftPct = r ? Math.round(RESERVE_PCT + r.usablePct * (1 - MARGIN)) : null;
  const fmt = (km) => (km < 10 ? km.toFixed(1) : km.toFixed(0));

  return (
    <Card style={{ marginTop: 12 }}>
      <View style={s.head}>
        <IconTile name="route" tone="grad" />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>There and back</Text>
          <Txt role="small">How far out you can ride and still get home</Txt>
        </View>
        {here?.weather ? <WeatherChip weather={here.weather} wind /> : null}
      </View>

      {r ? (
        <Animated.View entering={FadeIn.duration(DUR.base)}>
          <View style={s.bigRow} accessible accessibilityLabel={`${fmt(r.eachWayKm)} kilometres each way`}>
            {/* Plain text, not a count-up: it follows the battery slider live. */}
            <Text style={s.big}>{fmt(r.eachWayKm)}</Text>
            <Text style={s.unit}>km</Text>
            <Text style={s.each}>each way</Text>
          </View>
          <View style={s.facts}>
            <View style={s.fact}>
              <Text style={s.factValue}>{fmt(r.roundTripKm)} km</Text>
              <Txt role="label">Round trip</Txt>
            </View>
            <View style={[s.sep, { backgroundColor: t.line }]} />
            <View style={s.fact}>
              <Text style={s.factValue}>~{leftPct}%</Text>
              <Txt role="label">Left when home</Txt>
            </View>
          </View>

          {r.lowBattery ? (
            <View style={[s.note, { backgroundColor: t.dangerWash }]}>
              <Icon name="battery" size={16} color={t.danger} />
              <Text style={s.noteText}>Battery is nearly at the reserve. Charge before going anywhere far.</Text>
            </View>
          ) : null}

          {here?.coords ? (
            <View style={{ marginTop: 14 }}>
              <RangeMap center={here.coords} radiusM={r.radiusM} outerM={r.oneWayRadiusM} height={190} />
              <View style={s.legend}>
                <View style={[s.swatch, { backgroundColor: t.accentWash, borderColor: t.accentFill }]} />
                <Txt role="small">There and back</Txt>
                <View style={[s.swatch, { borderColor: t.grad[1], borderStyle: "dashed", marginLeft: 10 }]} />
                <Txt role="small">One way only</Txt>
              </View>
            </View>
          ) : here?.status === "blocked" ? (
            <Button
              title="Allow location in Settings"
              tone="secondary"
              size="small"
              icon="location"
              onPress={() => Linking.openSettings()}
              outerStyle={{ marginTop: 14 }}
            />
          ) : here?.status === "denied" ? (
            <Button
              title="Show it on a map"
              tone="secondary"
              size="small"
              icon="location"
              onPress={() => here.refresh({ ask: true })}
              outerStyle={{ marginTop: 14 }}
            />
          ) : null}

          <Txt role="small" style={{ marginTop: 12 }}>
            {basisLine(r, basis.mode ? modeLabel(preset, basis.mode) : null)}. The circle is drawn smaller than
            the distance, because roads are never straight.
          </Txt>
          {basis.source === "guess" ? (
            <Txt role="small" style={{ marginTop: 6, color: t.warn }}>
              A guess for now. Set the battery before and after one ride, and this becomes your own number.
            </Txt>
          ) : null}
        </Animated.View>
      ) : (
        <Txt style={{ marginTop: 12 }}>
          Set your battery above, and Rangely works out how far you can ride out and still make it back.
        </Txt>
      )}

      {warn ? (
        <View style={[s.note, { backgroundColor: warn.level === "danger" ? t.dangerWash : t.warnWash }]}>
          <Icon name="warning" size={16} color={warn.level === "danger" ? t.danger : t.warn} />
          <Text style={s.noteText}>{warn.text}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const useStyles = themed((t) =>
  StyleSheet.create({
    head: { flexDirection: "row", alignItems: "center", gap: 12 },
    title: { ...TYPE.heading, color: t.text },
    bigRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 14 },
    big: { ...TYPE.display, color: t.text },
    unit: { fontFamily: F.num, fontSize: 26, color: t.text3 },
    each: { fontFamily: F.bold, fontSize: 15, color: t.text2, marginLeft: 4 },
    facts: {
      flexDirection: "row", alignItems: "center", marginTop: 12, paddingVertical: 10,
      borderRadius: t.radiusSm, backgroundColor: t.surface2,
    },
    fact: { flex: 1, alignItems: "center", gap: 2 },
    factValue: { ...TYPE.value, fontSize: 22, lineHeight: 26, color: t.text },
    sep: { width: 1, alignSelf: "stretch", marginVertical: 4 },
    legend: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
    swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
    note: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 14, padding: 12, marginTop: 14 },
    noteText: { fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: t.text, flex: 1 },
  }),
);
