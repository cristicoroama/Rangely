import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { F, TYPE } from "../theme";
import { DUR, EASE, SPRING } from "../motion";
import { Button, Icon, IconTile, Txt, themed } from "../ui";
import { HeroPanel } from "../components/Gradient";
import { ScooterArt } from "../components/ScooterArt";
import { Choice } from "../components/Choice";
import { DisplayList, ScooterList } from "../components/ScooterPicker";
import { OTHER } from "../scooters";
import { AGE_BRACKETS, LOCAL } from "../rules";
import { DEFAULT_GOAL_KM } from "../goals";

/* --------------------------------------------------------------- welcome -- */

/** The scooter rides in from the left and settles with a little bounce —
 *  the first thing the app does is move. */
function DrivingScooter() {
  const x = useSharedValue(-320);
  const bob = useSharedValue(0);
  useEffect(() => {
    x.value = withDelay(150, withSpring(0, { damping: 14, stiffness: 90, mass: 1 }));
    bob.value = withDelay(1100, withTiming(1, { duration: 400 }));
  }, [x, bob]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: -3 * Math.sin(bob.value * Math.PI) }],
  }));
  return (
    <Animated.View style={[{ alignSelf: "center" }, style]}>
      <ScooterArt width={270} onHero />
    </Animated.View>
  );
}

function Welcome({ onNext }) {
  const [s, t] = useStyles();
  const features = [
    { icon: "route", text: "Record every ride, with its route" },
    { icon: "battery", text: "Find out how far you can really go" },
    { icon: "trophy", text: "Hit weekly goals, level up, earn badges" },
  ];
  return (
    <View style={s.step}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <DrivingScooter />
        <Animated.View entering={FadeInDown.delay(450).duration(DUR.slow)}>
          <Text style={s.brand}>
            Range<Text style={{ color: t.grad[0] }}>ly</Text>
          </Text>
          <Text style={s.lead}>How far can your scooter really go?</Text>
        </Animated.View>
        <View style={{ gap: 14, marginTop: 30 }}>
          {features.map((f, i) => (
            <Animated.View key={f.icon} entering={FadeInDown.delay(650 + i * 90).duration(DUR.base)} style={s.feature}>
              <IconTile name={f.icon} tone="hero" size={46} icon={22} />
              <Text style={s.featureText}>{f.text}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
      <Animated.View entering={FadeIn.delay(1000).duration(DUR.base)}>
        <Button title="Let's go" size="big" feel="medium" onPress={onNext} />
      </Animated.View>
    </View>
  );
}

const AGE_NOTES = {
  under14: `In Romania you have to be ${LOCAL.minAge} to ride an e-scooter on public roads. Until then, ride only where it is allowed and with a grown-up who says it's OK.`,
  "14-15": `At your age the law says: helmet on, every ride. Top speed is ${LOCAL.maxKmh} km/h and there's room for one rider only.`,
  "16-17": `A helmet isn't required by law at 16, but it's the best thing you can wear. Top speed is ${LOCAL.maxKmh} km/h.`,
  "18+": `Helmets are strongly recommended at any age. Top speed is ${LOCAL.maxKmh} km/h, one rider only.`,
};

function Age({ value, onPick, onNext }) {
  const [s, t] = useStyles();
  return (
    <View style={s.step}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>How old are you?</Text>
        <Txt style={s.sub}>So Rangely can show you the rules that apply to you. Only the age group is kept — no birthday.</Txt>
        <View style={{ gap: 10, marginTop: 22 }}>
          {AGE_BRACKETS.map((b) => (
            <Choice key={b.key} title={b.label} selected={value === b.key} onPress={() => onPick(b.key)} />
          ))}
        </View>
        {value ? (
          <Animated.View
            key={value}
            entering={FadeInDown.duration(DUR.base)}
            style={[s.note, { backgroundColor: value === "under14" ? t.warnWash : t.accentWash }]}
          >
            <Icon name={value === "under14" ? "warning" : "helmet"} size={20} color={value === "under14" ? t.warn : t.accent} />
            <Txt role="strong" style={{ flex: 1 }}>{AGE_NOTES[value]}</Txt>
          </Animated.View>
        ) : null}
      </ScrollView>
      <Button title="Continue" size="big" disabled={!value} onPress={onNext} />
    </View>
  );
}

function Scooter({ model, display, onModel, onDisplay, onDone }) {
  const [s] = useStyles();
  return (
    <View style={s.step}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>Which scooter?</Text>
        <Txt style={s.sub}>This fills in its battery size. Not listed? Pick “Another scooter”.</Txt>
        <View style={{ marginTop: 22 }}>
          <ScooterList value={model} onPick={onModel} />
        </View>
        <Text style={[s.h2, { marginTop: 28 }]}>How does it show the battery?</Text>
        <Txt style={s.sub}>So you can type it in the same way after a ride.</Txt>
        <View style={{ marginTop: 14 }}>
          <DisplayList value={display} onPick={onDisplay} />
        </View>
        <Txt role="small" style={{ marginTop: 20 }}>
          Your weekly goal starts at {DEFAULT_GOAL_KM} km. Change it any time in the Scooter tab.
        </Txt>
      </ScrollView>
      <Button title="Start riding" size="big" icon="play" feel="success" disabled={!model} onPress={onDone} />
    </View>
  );
}

/* ---------------------------------------------------------------- screen -- */

function Dots({ step, count, onHero }) {
  const [, t] = useStyles();
  return (
    <View style={styles.dots} accessibilityLabel={`Step ${step + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} on={i === step} done={i < step} t={t} onHero={onHero} />
      ))}
    </View>
  );
}

function Dot({ on, done, t, onHero }) {
  const w = useSharedValue(on ? 28 : 8);
  useEffect(() => {
    w.value = withSpring(on ? 28 : 8, SPRING.soft);
  }, [on, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: on || done ? t.grad[0] : onHero ? t.heroLine : t.lineStrong }, style]}
    />
  );
}

/**
 * Three screens, then out of the way: what the app does, how old you are (for
 * the rules, nothing more), and which scooter — the only three things it
 * cannot work out for itself. Everything else waits until it is needed.
 */
export function OnboardingScreen({ onDone }) {
  const [s] = useStyles();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [age, setAge] = useState(null);
  const [model, setModel] = useState(null);
  const [display, setDisplay] = useState("app");

  const finish = () => {
    const m = model;
    onDone({
      profile: { onboarded: true, ageBracket: age, goalKm: DEFAULT_GOAL_KM },
      scooter: {
        model: m.key,
        name: m.key === OTHER.key ? "My scooter" : m.name,
        packWh: m.packWh,
        display,
      },
    });
  };

  const screens = [
    <Welcome key="w" onNext={() => setStep(1)} />,
    <Age key="a" value={age} onPick={setAge} onNext={() => setStep(2)} />,
    <Scooter
      key="s"
      model={model?.key}
      display={display}
      onModel={setModel}
      onDisplay={setDisplay}
      onDone={finish}
    />,
  ];

  const hero = step === 0;
  const [, t] = useStyles();
  return (
    <View style={[s.screen, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
      <StatusBar style={hero ? "light" : t.statusBar} />
      {hero ? (
        <Animated.View entering={FadeIn.duration(DUR.base)} exiting={FadeOut.duration(DUR.slow)} style={StyleSheet.absoluteFill}>
          <HeroPanel radius={0} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}
      <View style={styles.top}>
        {step > 0 ? (
          <Text style={s.back} onPress={() => setStep(step - 1)} accessibilityRole="button" suppressHighlighting>
            Back
          </Text>
        ) : (
          <View style={{ width: 44 }} />
        )}
        <Dots step={step} count={screens.length} onHero={hero} />
        <View style={{ width: 44 }} />
      </View>
      <Animated.View
        key={step}
        entering={step === 0 ? FadeIn.duration(DUR.base) : SlideInRight.duration(DUR.slow).easing(EASE.enter)}
        exiting={SlideOutLeft.duration(DUR.base).easing(EASE.exit)}
        style={{ flex: 1 }}
      >
        {screens[step]}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, height: 44 },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
});

const useStyles = themed((t) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    step: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
    brand: { fontFamily: F.heavy, fontSize: 56, lineHeight: 64, letterSpacing: -2, color: t.onHero, textAlign: "center", marginTop: 18 },
    lead: { ...TYPE.heading, color: t.onHero2, textAlign: "center", marginTop: 4 },
    feature: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 8 },
    featureText: { ...TYPE.bodyStrong, fontSize: 17, color: t.onHero, flex: 1 },
    h1: { ...TYPE.title, color: t.text },
    h2: { ...TYPE.heading, color: t.text },
    sub: { marginTop: 6 },
    note: { flexDirection: "row", gap: 12, alignItems: "flex-start", borderRadius: 18, padding: 16, marginTop: 16 },
    back: { fontSize: 16, fontFamily: F.heavy, color: t.accent, width: 44, paddingVertical: 10 },
  }),
);
