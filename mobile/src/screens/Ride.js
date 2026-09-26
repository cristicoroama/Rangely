import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { F, TYPE } from "../theme";
import { DUR } from "../motion";
import { Button, Icon, Pill, Txt, themed } from "../ui";
import { RecDot } from "../components/RecDot";
import { HoldButton } from "../components/HoldButton";
import { HeroPanel } from "../components/Gradient";
import { ModeTag } from "../components/ModePicker";
import { RouteMap } from "../map";
import { avgSpeed, currentSpeed, fmtDuration, msToKmh } from "../ride";
import { LOCAL } from "../rules";
import { clockMs } from "../useRideTracker";
import { useNow } from "../useNow";

/**
 * The live ride, full screen.
 *
 * Built to be read in under a second from arm's length on a handlebar: one
 * enormous number (how far) on the dark panel, three under it, the map for
 * "where am I", and two controls that cannot be confused — a tap to pause,
 * and a hold to finish, so a gloved thumb or a bump in the road never ends a
 * ride. Paused looks different at a glance: amber, dimmed, and it says so.
 *
 * Speed is not a headline. The scooter already shows it, and making the
 * fastest number the biggest thing on screen rewards the wrong thing; it only
 * appears here as a nudge when the ride goes over the legal limit.
 */
export function RideScreen({ tracker, onFinish, ridingMode, ridingLabel, dual }) {
  const [s, t] = useStyles();
  const insets = useSafeAreaInsets();
  const { state, paused, mode, clock, pause, resume } = tracker;
  const now = useNow(1000, !paused);

  const km = state.distance / 1000;
  const avg = msToKmh(avgSpeed(state));
  const speedNow = msToKmh(currentSpeed(state));
  const over = !paused && speedNow > LOCAL.maxKmh + 1;
  const searching = !paused && !state.last;

  const dim = useAnimatedStyle(() => ({
    opacity: withTiming(paused ? 0.5 : 1, { duration: DUR.base }),
  }));

  return (
    <View style={[s.screen, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <HeroPanel style={[s.hero, { paddingTop: insets.top + 10 }]}>
        <View style={s.top}>
          <View style={[s.status, { backgroundColor: paused ? "rgba(245,165,36,0.18)" : "rgba(239,75,63,0.2)" }]}>
            <RecDot paused={paused} size={10} />
            <Text style={[s.statusText, { color: paused ? "#FFC56B" : "#FF8A80" }]}>
              {paused ? "PAUSED" : "RECORDING"}
            </Text>
          </View>
          {/* The mode chosen before the ride, as a reminder of what these
              numbers were measured in. */}
          <View style={{ flexDirection: "row", gap: 6 }}>
            <ModeTag mode={ridingMode} label={ridingLabel} onHero />
            {dual ? <ModeTag mode="turbo" label="Dual" onHero /> : null}
          </View>
        </View>

        <Animated.View style={[s.heroRow, dim]}>
          <Text
            style={s.heroValue}
            adjustsFontSizeToFit
            numberOfLines={1}
            accessibilityLabel={`${km.toFixed(2)} kilometres`}
          >
            {km.toFixed(2)}
          </Text>
          <Text style={s.heroUnit}>km</Text>
        </Animated.View>

        <Animated.View style={[s.stats, dim]}>
          <View style={s.stat}>
            <Text style={s.statValue}>{fmtDuration(clockMs(clock, now) / 1000)}</Text>
            <Text style={s.statLabel}>Time</Text>
          </View>
          <View style={s.sep} />
          <View style={s.stat}>
            <Text style={s.statValue}>
              {avg.toFixed(1)}
              <Text style={s.statUnit}> km/h</Text>
            </Text>
            <Text style={s.statLabel}>Average</Text>
          </View>
          <View style={s.sep} />
          <View style={s.stat}>
            <Text style={s.statValue}>
              {Math.round(state.ascent)}
              <Text style={s.statUnit}> m</Text>
            </Text>
            <Text style={s.statLabel}>Climbed</Text>
          </View>
        </Animated.View>
      </HeroPanel>

      <View style={s.mapWrap}>
        <RouteMap track={state.track} live={!paused} height={undefined} style={{ flex: 1 }} />
        <View style={s.overlay} pointerEvents="none">
          {searching ? (
            <Animated.View entering={FadeIn.duration(DUR.quick)} exiting={FadeOut.duration(DUR.quick)}>
              <Pill icon="target">Finding your location…</Pill>
            </Animated.View>
          ) : null}
          {over ? (
            <Animated.View entering={FadeIn.duration(DUR.quick)} exiting={FadeOut.duration(DUR.base)}>
              <Pill tone="warn" icon="warning">Over {LOCAL.maxKmh} km/h — ease off</Pill>
            </Animated.View>
          ) : null}
          {state.gaps > 0 ? (
            <Pill icon="warning">
              {state.gaps === 1 ? "1 gap in the GPS" : `${state.gaps} gaps in the GPS`}
            </Pill>
          ) : null}
        </View>
      </View>

      <View style={s.controls}>
        <Button
          title={paused ? "Resume" : "Pause"}
          icon={paused ? "play" : "pause"}
          tone={paused ? "primary" : "secondary"}
          size="big"
          feel="medium"
          onPress={paused ? resume : pause}
          outerStyle={{ flex: 1 }}
        />
        <HoldButton label="Hold to finish" onComplete={onFinish} style={{ flex: 1.35 }} />
      </View>
      {!paused ? (
        <View style={s.note}>
          <Icon name={mode === "background" ? "check" : "light"} size={13} color={mode === "background" ? t.accent : t.text3} />
          <Txt role="small">
            {mode === "background"
              ? "You can turn the screen off — it keeps recording."
              : "The screen stays on so the ride keeps recording."}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = themed((t) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    hero: {
      borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
      paddingHorizontal: 18, paddingBottom: 16,
    },
    top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 },
    status: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 32, borderRadius: 999 },
    statusText: { fontFamily: F.heavy, fontSize: 13, letterSpacing: 1.6 },

    heroRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", marginTop: 6 },
    heroValue: { ...TYPE.hero, color: t.onHero, flexShrink: 1 },
    heroUnit: { fontFamily: F.num, fontSize: 34, color: t.onHero3, marginLeft: 8 },

    stats: {
      flexDirection: "row", alignItems: "center", marginTop: 8,
      backgroundColor: t.heroFill, borderRadius: t.radiusSm, paddingVertical: 12,
      borderWidth: 1, borderColor: t.heroLine,
    },
    stat: { flex: 1, alignItems: "center", gap: 2 },
    statValue: { ...TYPE.value, fontSize: 32, lineHeight: 34, color: t.onHero },
    statUnit: { fontFamily: F.bold, fontSize: 13, color: t.onHero3 },
    statLabel: { ...TYPE.label, color: t.onHero3 },
    sep: { width: 1, alignSelf: "stretch", marginVertical: 4, backgroundColor: t.heroLine },

    mapWrap: { flex: 1, minHeight: 160, marginHorizontal: 12, marginTop: 12 },
    overlay: { position: "absolute", top: 12, left: 12, right: 12, gap: 8, alignItems: "flex-start" },

    controls: { flexDirection: "row", gap: 12, marginTop: 14, paddingHorizontal: 12 },
    note: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 },
  }),
);
