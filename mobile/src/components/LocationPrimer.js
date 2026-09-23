import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets, SafeAreaProvider } from "react-native-safe-area-context";

import { TYPE, useTheme } from "../theme";
import { DUR, EASE } from "../motion";
import { Button, Icon, IconTile, Txt } from "../ui";

function Sheet({ onContinue, onCancel }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const points = [
    { icon: "route", text: "Draws your route and measures the distance" },
    { icon: "lock", text: "Only while you are recording a ride" },
    { icon: "check", text: "Stays on your phone — nothing is uploaded" },
  ];
  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(DUR.base)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Not now" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(DUR.slow).easing(EASE.enter)}
        style={[styles.sheet, { backgroundColor: t.surface, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
      >
        <View style={[styles.grabber, { backgroundColor: t.lineStrong }]} />
        <IconTile name="target" tone="grad" size={64} icon={30} />
        <Text style={[styles.title, { color: t.text }]}>Rangely needs your location</Text>
        <Txt style={{ textAlign: "center" }}>
          Your phone will ask next. Choose “While using the app”.
        </Txt>
        <View style={{ gap: 12, alignSelf: "stretch", marginVertical: 18 }}>
          {points.map((p) => (
            <View key={p.icon} style={styles.point}>
              <Icon name={p.icon} size={18} color={t.accent} strokeWidth={2.4} />
              <Txt role="strong" style={{ flex: 1 }}>{p.text}</Txt>
            </View>
          ))}
        </View>
        <Button title="Continue" size="big" onPress={onContinue} outerStyle={{ alignSelf: "stretch" }} />
        <Button title="Not now" tone="ghost" onPress={onCancel} outerStyle={{ alignSelf: "stretch" }} />
      </Animated.View>
    </View>
  );
}

/**
 * Said in the app's own words before Android asks in its own. A request that
 * arrives with its reason is granted far more often than a bare system
 * dialog, and a denied location permission is the one thing that makes this
 * app useless — Android stops asking after the second no.
 */
export function LocationPrimer({ open, onContinue, onCancel }) {
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>{open ? <Sheet onContinue={onContinue} onCancel={onCancel} /> : null}</SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 10,
    alignItems: "center", gap: 10,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, marginBottom: 12 },
  title: { ...TYPE.title, fontSize: 25, lineHeight: 31, textAlign: "center", marginTop: 6 },
  point: { flexDirection: "row", alignItems: "center", gap: 12 },
});
