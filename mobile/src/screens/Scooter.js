import { useEffect, useState } from "react";
import { Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { F, TYPE } from "../theme";
import { DUR } from "../motion";
import { Button, Card, Icon, IconTile, Pill, Press, SectionTitle, Txt, themed } from "../ui";
import { PhotoHero } from "../components/PhotoHero";
import { ActionSheet } from "../components/ActionSheet";
import { forgetScooterPhoto, pickScooterPhoto } from "../scooterPhoto";
import { haptic } from "../haptics";
import { DisplayList, ScooterList, SpeedNote } from "../components/ScooterPicker";
import { OTHER, findScooter } from "../scooters";
import { AGE_BRACKETS, LOCAL, needsHelmetByLaw } from "../rules";
import { useKeyboardHeight } from "../useKeyboard";

const enter = (i) => FadeInDown.delay(60 + i * 60).duration(DUR.base);

/* ----------------------------------------------------------- model sheet -- */

function ModelSheet({ open, value, onPick, onClose }) {
  const [s, t] = useStyles();
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <SheetBody value={value} onPick={onPick} onClose={onClose} s={s} t={t} />
      </SafeAreaProvider>
    </Modal>
  );
}

function SheetBody({ value, onPick, onClose, s, t }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View style={s.sheetBar}>
        <Text style={[s.h1, { flex: 1 }]}>Which scooter?</Text>
        <Press onPress={onClose} style={s.round} accessibilityLabel="Close" hitSlop={10}>
          <Icon name="close" size={20} color={t.text} />
        </Press>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 24 }}>
        <ScooterList value={value} onPick={onPick} />
      </ScrollView>
    </View>
  );
}

/* ----------------------------------------------------------------- field -- */

/** A text field that commits when you are done with it, not on every key —
 *  a half-typed "4" must not become a 4 Wh battery for a moment. */
function Field({ label, value, onCommit, numeric, suffix, placeholder }) {
  const [s, t] = useStyles();
  const [text, setText] = useState(String(value ?? ""));
  useEffect(() => setText(String(value ?? "")), [value]);
  return (
    <View style={s.fieldRow}>
      <Txt role="strong" style={{ flex: 1 }}>{label}</Txt>
      <View style={[s.field, { backgroundColor: t.surface2, borderColor: t.line }]}>
        <TextInput
          value={text}
          onChangeText={(v) => setText(numeric ? v.replace(/[^0-9]/g, "").slice(0, 4) : v.slice(0, 32))}
          onEndEditing={() => onCommit(text)}
          onSubmitEditing={() => onCommit(text)}
          keyboardType={numeric ? "number-pad" : "default"}
          placeholder={placeholder}
          placeholderTextColor={t.text3}
          returnKeyType="done"
          style={[s.input, { color: t.text, textAlign: numeric ? "right" : "left" }]}
          accessibilityLabel={label}
        />
        {suffix ? <Text style={s.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/* ----------------------------------------------------------------- rules -- */

function RuleRow({ icon, text, you }) {
  const [s, t] = useStyles();
  return (
    <View style={s.rule}>
      <View style={[s.ruleIcon, { backgroundColor: you ? t.warnWash : t.surface2 }]}>
        {typeof icon === "string" && icon.length <= 3 && !/[a-z]/.test(icon) ? (
          <Text style={[s.ruleBadge, { color: you ? t.warn : t.text2 }]}>{icon}</Text>
        ) : (
          <Icon name={icon} size={18} color={you ? t.warn : t.text2} />
        )}
      </View>
      <Text style={s.ruleText}>{text}</Text>
      {you ? <Pill tone="warn">You</Pill> : null}
    </View>
  );
}

/* ---------------------------------------------------------------- screen -- */

export function ScooterScreen({
  scooter, onScooter, profile, onProfile, canBackground, onEnableBackground,
  dev,
}) {
  const [s, t] = useStyles();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const [picking, setPicking] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);

  const setPhoto = async (from) => {
    const r = await pickScooterPhoto(from);
    if (r.ok) {
      if (scooter.photo && scooter.photo !== r.uri) forgetScooterPhoto(scooter.photo);
      onScooter({ ...scooter, photo: r.uri });
      haptic.success();
    } else if (r.reason === "camera") {
      Alert.alert("Camera is off for Rangely", "Allow the camera in Settings to take a photo of your scooter.", [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]);
    }
  };

  const photoActions = [
    { label: "Take a photo", icon: "camera", onPress: () => setPhoto("camera") },
    { label: "Choose from gallery", icon: "photo", onPress: () => setPhoto("library") },
    ...(scooter.photo
      ? [{
          label: "Remove my photo",
          icon: "trash",
          destructive: true,
          onPress: () => {
            forgetScooterPhoto(scooter.photo);
            onScooter({ ...scooter, photo: null });
          },
        }]
      : []),
  ];
  const preset = findScooter(scooter.model);
  const helmetForYou = needsHelmetByLaw(profile.ageBracket);

  const pick = (m) => {
    setPicking(false);
    onScooter({
      ...scooter,
      model: m.key,
      name: m.key === OTHER.key ? (preset ? "My scooter" : scooter.name) : m.name,
      packWh: m.key === OTHER.key ? scooter.packWh : m.packWh,
      display: m.key === OTHER.key ? scooter.display : m.display ?? scooter.display,
    });
  };

  const setGoal = (km) => onProfile({ ...profile, goalKm: Math.max(5, Math.min(300, km)) });

  let i = 0;
  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingTop: insets.top + 14, paddingBottom: 32 + kb }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={enter(i++)}>
        <Text style={s.title}>Your scooter</Text>
      </Animated.View>

      <Animated.View entering={enter(i++)}>
        <PhotoHero
          source={scooter.photo ? { uri: scooter.photo } : undefined}
          style={s.hero}
          zoom={false}
          fade={["rgba(6,14,12,0.05)", "rgba(6,14,12,0.6)", "rgba(6,14,12,0.94)"]}
        >
          {/* Your own scooter, not a stock one: a photo button on the picture. */}
          <View style={s.photoRow}>
            <Press
              onPress={() => setPhotoMenu(true)}
              feel="tap"
              style={s.photoBtn}
              accessibilityLabel={scooter.photo ? "Change the photo of your scooter" : "Add a photo of your scooter"}
            >
              <Icon name={scooter.photo ? "camera" : "cameraPlus"} size={18} color={t.onHero} />
              <Text style={s.photoBtnText}>{scooter.photo ? "Change photo" : "Add your photo"}</Text>
            </Press>
          </View>
          <View style={{ height: 106 }} />
          <Text style={s.heroLabel}>Model</Text>
          <Text style={s.heroName} numberOfLines={2}>
            {preset ? preset.name : scooter.model === OTHER.key ? "Another scooter" : "Choose your model"}
          </Text>
          <View style={s.heroMeta}>
            <Pill tone="hero" icon="battery">{`${scooter.packWh} Wh battery`}</Pill>
            <Press onPress={() => setPicking(true)} style={s.changeBtn} accessibilityLabel="Change scooter model">
              <Text style={s.changeText}>Change</Text>
              <Icon name="chevron" size={16} color={t.gradInk} strokeWidth={2.6} />
            </Press>
          </View>
          <SpeedNote model={scooter.model} onHero style={{ marginTop: 14 }} />
        </PhotoHero>
      </Animated.View>

      <Animated.View entering={enter(i++)}>
        <Card style={{ gap: 14, marginTop: 12 }}>
          <Field
            label="Name"
            value={scooter.name}
            placeholder="My scooter"
            onCommit={(v) => onScooter({ ...scooter, name: v.trim() || "My scooter" })}
          />
          <Field
            label="Battery size"
            value={scooter.packWh}
            numeric
            suffix="Wh"
            onCommit={(v) => {
              const n = Number(v);
              onScooter({ ...scooter, packWh: Number.isFinite(n) && n >= 50 ? n : scooter.packWh });
            }}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={enter(i++)}>
        <SectionTitle>How it shows the battery</SectionTitle>
        <DisplayList value={scooter.display} onPick={(d) => onScooter({ ...scooter, display: d })} />
      </Animated.View>

      <Animated.View entering={enter(i++)}>
        <SectionTitle>Weekly goal</SectionTitle>
        <Card>
          <View style={s.stepper}>
            <Press onPress={() => setGoal(profile.goalKm - 5)} feel="tap" style={s.stepBtn} accessibilityLabel="Lower goal">
              <Text style={s.stepText}>−</Text>
            </Press>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={s.goalValue}>{profile.goalKm}</Text>
              <Txt role="label">km a week</Txt>
            </View>
            <Press onPress={() => setGoal(profile.goalKm + 5)} feel="tap" style={s.stepBtn} accessibilityLabel="Raise goal">
              <Text style={s.stepText}>+</Text>
            </Press>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(i++)}>
        <SectionTitle>Recording</SectionTitle>
        <Card>
          {canBackground ? (
            <View style={s.recRow}>
              <IconTile name="check" tone="green" />
              <Txt role="strong" style={{ flex: 1 }}>Rides keep recording with the screen off.</Txt>
            </View>
          ) : (
            <>
              <View style={s.recRow}>
                <IconTile name="light" tone="warn" />
                <Txt role="strong" style={{ flex: 1 }}>Record with the screen off</Txt>
              </View>
              <Txt style={{ marginTop: 4, marginBottom: 14 }}>
                Right now the screen has to stay on during a ride. Android calls the setting that
                changes this “Allow all the time” — Rangely only uses it while you are recording.
              </Txt>
              <Button title="Allow screen-off recording" tone="secondary" icon="light" onPress={onEnableBackground} />
            </>
          )}
        </Card>
      </Animated.View>

      <Animated.View entering={enter(i++)}>
        <SectionTitle>Riding in Romania</SectionTitle>
        <Card style={{ gap: 12 }}>
          <View style={s.recRow}>
            <IconTile name="helmet" tone="aqua" />
            <Txt role="strong" style={{ flex: 1 }}>Your age group</Txt>
          </View>
          <View style={s.ageRow}>
            {AGE_BRACKETS.map((b) => {
              const on = profile.ageBracket === b.key;
              return (
                <Press
                  key={b.key}
                  feel="tap"
                  onPress={() => onProfile({ ...profile, ageBracket: b.key })}
                  accessibilityRole="radio"
                  accessibilityLabel={b.label}
                  outerStyle={{ flex: 1 }}
                  style={[s.ageChip, { backgroundColor: on ? t.accentFill : t.surface2 }]}
                >
                  <Text style={[s.ageText, { color: on ? t.accentInk : t.text2 }]}>{b.label.replace(" or older", "+")}</Text>
                </Press>
              );
            })}
          </View>
          <View style={s.divider} />
          <RuleRow icon={`${LOCAL.minAge}+`} text={`At least ${LOCAL.minAge} to ride on public roads`} you={profile.ageBracket === "under14"} />
          <RuleRow icon="helmet" text={`Helmet required under ${LOCAL.helmetUnder}`} you={helmetForYou} />
          <RuleRow icon="speed" text={`${LOCAL.maxKmh} km/h is the limit`} />
          <RuleRow icon="close" text="One rider — no passengers" />
          <RuleRow icon="light" text="Lights on after dark" />
          <Txt role="small" style={{ marginTop: 4 }}>
            Checked {LOCAL.updated}. Laws change, so treat this as a guide rather than legal advice.
          </Txt>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(i++)}>
        <SectionTitle>Privacy</SectionTitle>
        <Card tone="flat" style={{ flexDirection: "row", gap: 12 }}>
          <IconTile name="lock" tone="grey" />
          <Txt style={{ flex: 1 }}>
            Your rides stay on this phone. There is no account and nothing is uploaded. The map
            loads its streets from OpenStreetMap while you look at it.
          </Txt>
        </Card>
      </Animated.View>

      {dev ? (
        <Animated.View entering={enter(i++)}>
          <SectionTitle>Development</SectionTitle>
          <Card style={{ gap: 10 }}>
            <Txt role="small">Only in development builds.</Txt>
            <Button title="Load demo history" tone="secondary" size="small" onPress={dev.seed} />
            {dev.hasDemo ? <Button title="Remove demo rides" tone="secondary" size="small" onPress={dev.clear} /> : null}
            <Button title="Show the welcome screens" tone="secondary" size="small" onPress={dev.replay} />
          </Card>
        </Animated.View>
      ) : null}

      <ModelSheet open={picking} value={scooter.model} onPick={pick} onClose={() => setPicking(false)} />
      <ActionSheet
        open={photoMenu}
        title="Photo of your scooter"
        actions={photoActions}
        onClose={() => setPhotoMenu(false)}
      />
    </ScrollView>
  );
}

const useStyles = themed((t) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: 18 },
    title: { ...TYPE.title, fontSize: 34, lineHeight: 38, color: t.text, marginBottom: 16 },
    h1: { ...TYPE.title, color: t.text },
    sheetBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, gap: 12 },
    round: {
      width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center",
      backgroundColor: t.surface, borderWidth: 1, borderColor: t.line,
    },
    hero: { padding: 18, borderRadius: t.radius + 4 },
    heroLabel: { ...TYPE.label, color: t.onHero3, marginTop: 12 },
    heroName: { ...TYPE.title, fontSize: 24, lineHeight: 30, color: t.onHero, marginTop: 2 },
    heroMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
    changeBtn: {
      flexDirection: "row", alignItems: "center", gap: 4, height: 40, paddingHorizontal: 16,
      borderRadius: 999, backgroundColor: t.grad[0],
    },
    changeText: { fontFamily: F.heavy, fontSize: 14, color: t.gradInk },
    photoRow: { flexDirection: "row", justifyContent: "flex-end" },
    photoBtn: {
      flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 14,
      borderRadius: 999, backgroundColor: "rgba(0,0,0,0.42)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    },
    photoBtnText: { fontFamily: F.bold, fontSize: 14, color: t.onHero },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.line },
    fieldRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    field: {
      flexDirection: "row", alignItems: "center", minWidth: 150, maxWidth: 200, height: 48,
      borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, gap: 6,
    },
    input: { flex: 1, minWidth: 0, fontSize: 17, fontFamily: F.bold, padding: 0 },
    suffix: { fontSize: 15, fontFamily: F.bold, color: t.text3 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepBtn: { width: 60, height: 60, borderRadius: 18, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" },
    stepText: { fontSize: 30, fontFamily: F.bold, color: t.text, marginTop: -2 },
    goalValue: { ...TYPE.display, fontSize: 60, lineHeight: 60, color: t.text },
    recRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    ageRow: { flexDirection: "row", gap: 8 },
    ageChip: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    ageText: { fontSize: 15, fontFamily: F.heavy },
    rule: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40 },
    ruleIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
    ruleBadge: { fontSize: 13, fontFamily: F.heavy },
    ruleText: { ...TYPE.bodyStrong, color: t.text, flex: 1 },
  }),
);
