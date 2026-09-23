import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, BackHandler, Linking, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as Location from "expo-location";
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideInRight, SlideOutDown, SlideOutRight,
} from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FONT_FILES, useTheme } from "./src/theme";
import { DUR, EASE } from "./src/motion";
import { haptic } from "./src/haptics";
import { TabBar } from "./src/components/TabBar";
import { HomeScreen } from "./src/screens/Home";
import { RideScreen } from "./src/screens/Ride";
import { FinishScreen } from "./src/screens/Finish";
import { HistoryScreen } from "./src/screens/History";
import { RideDetail } from "./src/screens/RideDetail";
import { ScooterScreen } from "./src/screens/Scooter";
import { OnboardingScreen } from "./src/screens/Onboarding";
import { LocationPrimer } from "./src/components/LocationPrimer";
import { useRideTracker } from "./src/useRideTracker";
import { energyStats, parsePercent } from "./src/ride";
import { displayResolution } from "./src/scooters";
import { buildDemoRides } from "./src/demoRides";
import {
  DEFAULT_PROFILE, DEFAULT_SCOOTER, deleteRide, loadProfile, loadRides, loadScooter,
  replaceRides, saveProfile, saveRide, saveScooter,
} from "./src/storage";

/** Under fifty metres there is no ride, only GPS drift — saving it would
 *  pollute the history and every total built on it. */
const MIN_RIDE_M = 50;

const TABS = [
  { key: "home", label: "Ride", icon: "play" },
  { key: "history", label: "History", icon: "list" },
  { key: "scooter", label: "Scooter", icon: "scooter" },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const t = useTheme();
  const tracker = useRideTracker();
  // Bundled fonts, loaded before the first frame; a failure falls back to the
  // system font rather than a blank app.
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [priming, setPriming] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [rides, setRides] = useState([]);
  const [scooter, setScooter] = useState(DEFAULT_SCOOTER);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const [tab, setTab] = useState("home");
  const [starting, setStarting] = useState(false);
  // A ride that has stopped but is not written down yet. It exists because the
  // end-of-ride battery reading can only be typed AFTER the ride.
  const [pending, setPending] = useState(null);
  const [batteryStart, setBatteryStart] = useState("");
  const [batteryEnd, setBatteryEnd] = useState("");
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    Promise.all([loadRides(), loadScooter(), loadProfile()]).then(([r, s, p]) => {
      setRides(r);
      setScooter(s);
      setProfile(p);
      setLoaded(true);
    });
  }, []);

  const updateScooter = useCallback(async (next) => setScooter(await saveScooter(next)), []);
  const updateProfile = useCallback(async (next) => setProfile(await saveProfile(next)), []);

  /* ---------------------------------------------------------- the ride -- */

  async function begin() {
    setStarting(true);
    const r = await tracker.start();
    setStarting(false);
    if (!r.ok) {
      haptic.warning();
      Alert.alert("Can't start the ride", r.error || "The GPS is not available.");
    }
  }

  // The first time, the app explains why it wants location before Android
  // asks. If Android has stopped asking, the only way left is Settings.
  async function onStart() {
    let perm = null;
    try {
      perm = await Location.getForegroundPermissionsAsync();
    } catch {
      /* ask anyway */
    }
    if (perm?.status === "granted") return begin();
    if (perm && perm.canAskAgain === false) {
      Alert.alert(
        "Location is off for Rangely",
        "Turn it on in Settings › Apps › Rangely › Permissions › Location, then come back.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );
      return undefined;
    }
    setPriming(true);
    return undefined;
  }

  function onFinish() {
    const finished = tracker.stop();
    if (finished.distance < MIN_RIDE_M) {
      const buttons = [
        {
          text: "OK",
          onPress: () => tracker.reset(),
        },
      ];
      // In development, the finish screen has to be reachable from a desk.
      if (__DEV__) buttons.unshift({ text: "Show it anyway", onPress: () => setPending(finished) });
      Alert.alert("Too short to save", "You need to ride at least 50 metres for it to count.", buttons);
      return;
    }
    setPending(finished);
  }

  async function onSave() {
    const p = pending;
    const energy = energyStats({
      batteryStart,
      batteryEnd,
      packWh: Number(scooter.packWh),
      distanceM: p.distance,
      resolution: displayResolution(scooter.display),
    });
    const ride = {
      id: String(p.startedAt ?? Date.now()),
      startedAt: p.startedAt ?? Date.now(),
      distance: p.distance,
      movingTime: p.movingTime,
      elapsed: p.elapsed,
      topSpeed: p.topSpeed,
      ascent: p.ascent,
      gaps: p.gaps,
      // Already thinned as it was recorded: shape enough to draw, small
      // enough to keep.
      track: p.track,
      scooter: scooter.name,
      model: scooter.model,
      battery: energy ? { start: parsePercent(batteryStart), end: parsePercent(batteryEnd) } : null,
      energy,
    };
    setRides(await saveRide(ride));
    setPending(null);
    tracker.reset();
    setBatteryStart("");
    setBatteryEnd("");
    // Back to the goal ring, which now takes the new kilometres — the reward
    // for saving, shown rather than told.
    setTab("home");
  }

  function onDiscard() {
    Alert.alert("Discard this ride?", "It won't be saved anywhere.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          setPending(null);
          tracker.reset();
          setBatteryEnd("");
        },
      },
    ]);
  }

  async function onEnableBackground() {
    const ok = await tracker.enableBackground();
    if (ok) haptic.success();
    Alert.alert(
      ok ? "Screen-off recording is on" : "Still screen-on only",
      ok
        ? "Your next ride keeps recording with the phone in your pocket."
        : "Android wants location set to “Allow all the time”: Settings › Apps › Rangely › Permissions › Location.",
    );
  }

  async function onDelete(id) {
    setDetail(null);
    setRides(await deleteRide(id));
  }

  /* ------------------------------------------------------- development -- */

  const dev = useMemo(
    () =>
      __DEV__
        ? {
            hasDemo: rides.some((r) => r.demo),
            seed: async () => {
              const mine = rides.filter((r) => !r.demo);
              const next = [...buildDemoRides(Number(scooter.packWh) || 500), ...mine].sort(
                (a, b) => (b.startedAt || 0) - (a.startedAt || 0),
              );
              setRides(await replaceRides(next));
              haptic.success();
            },
            clear: async () => setRides(await replaceRides(rides.filter((r) => !r.demo))),
            replay: () => updateProfile({ ...profile, onboarded: false }),
          }
        : null,
    [rides, scooter.packWh, profile, updateProfile],
  );

  /* --------------------------------------------------- android back key -- */

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (priming) {
        setPriming(false);
        return true;
      }
      if (detail) {
        setDetail(null);
        return true;
      }
      // Mid-ride, back does nothing: a ride ends with the hold button, never
      // by a thumb brushing the edge of the screen.
      if (tracker.tracking) return true;
      if (pending) {
        onDiscard();
        return true;
      }
      if (tab !== "home") {
        setTab("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  });

  /* ------------------------------------------------------------ screens -- */

  let screen;
  let key;
  if (!loaded || (!fontsLoaded && !fontError)) {
    key = "loading";
    screen = null;
  } else if (!profile.onboarded) {
    key = "onboarding";
    screen = (
      <OnboardingScreen
        onDone={async ({ profile: p, scooter: s }) => {
          await updateScooter({ ...scooter, ...s });
          await updateProfile({ ...profile, ...p });
        }}
      />
    );
  } else if (tracker.tracking) {
    key = "ride";
    screen = <RideScreen tracker={tracker} onFinish={onFinish} />;
  } else if (pending) {
    key = "finish";
    screen = (
      <FinishScreen
        ride={pending}
        rides={rides}
        profile={profile}
        scooter={scooter}
        batteryStart={batteryStart}
        onBatteryStart={setBatteryStart}
        batteryEnd={batteryEnd}
        onBatteryEnd={setBatteryEnd}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    );
  } else {
    key = `tab-${tab}`;
    screen = (
      <View style={{ flex: 1 }}>
        <Animated.View key={tab} entering={FadeIn.duration(DUR.quick)} style={{ flex: 1 }}>
          {tab === "home" ? (
            <HomeScreen
              rides={rides}
              scooter={scooter}
              profile={profile}
              battery={batteryStart}
              onBattery={setBatteryStart}
              onStart={onStart}
              starting={starting}
              canBackground={tracker.canBackground}
              onOpenRide={setDetail}
              onSeeAll={() => setTab("history")}
              onOpenScooter={() => setTab("scooter")}
            />
          ) : tab === "history" ? (
            <HistoryScreen rides={rides} onOpen={setDetail} />
          ) : (
            <ScooterScreen
              scooter={scooter}
              onScooter={updateScooter}
              profile={profile}
              onProfile={updateProfile}
              canBackground={tracker.canBackground}
              onEnableBackground={onEnableBackground}
              dev={dev}
            />
          )}
        </Animated.View>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </View>
    );
  }

  // The live ride rises over everything and sinks away when it ends; the
  // rest cross-fade. Each screen is its own layer, so the one leaving can
  // finish its exit on top of the one arriving.
  const isRide = key === "ride";
  const inAnim = isRide
    ? SlideInDown.duration(DUR.slow).easing(EASE.enter)
    : FadeIn.duration(DUR.base);
  const outAnim = isRide ? SlideOutDown.duration(DUR.base).easing(EASE.exit) : FadeOut.duration(DUR.quick);
  const mainKey = key.startsWith("tab-") ? "tabs" : key;
  // Screens that open on a dark hero want light status-bar icons whatever
  // the theme; the rest follow it. Onboarding sets its own.
  const barStyle = key === "tab-home" || key === "ride" || key === "finish" ? "light" : t.statusBar;

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <StatusBar style={barStyle} />
      <Animated.View key={mainKey} entering={inAnim} exiting={outAnim} style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]}>
        {screen}
      </Animated.View>
      {detail && key.startsWith("tab-") ? (
        <Animated.View
          entering={SlideInRight.duration(DUR.slow).easing(EASE.enter)}
          exiting={SlideOutRight.duration(DUR.base).easing(EASE.exit)}
          style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]}
        >
          <RideDetail ride={detail} onClose={() => setDetail(null)} onDelete={onDelete} />
        </Animated.View>
      ) : null}
      <LocationPrimer
        open={priming}
        onCancel={() => setPriming(false)}
        onContinue={() => {
          setPriming(false);
          begin();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
