import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { F, TYPE, useTheme } from "../theme";
import { DUR, EASE } from "../motion";
import { Icon, Press } from "../ui";

function Sheet({ title, actions, onClose }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(DUR.base)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(DUR.slow).easing(EASE.enter)}
        style={[styles.sheet, { backgroundColor: t.surface, paddingBottom: Math.max(insets.bottom, 12) + 8 }]}
      >
        <View style={[styles.grabber, { backgroundColor: t.lineStrong }]} />
        {title ? <Text style={[styles.title, { color: t.text }]}>{title}</Text> : null}
        {actions.map((a) => (
          <Press
            key={a.label}
            feel="tap"
            onPress={() => {
              onClose();
              // Let the sheet close before a system screen (camera, picker)
              // opens over it.
              setTimeout(a.onPress, 250);
            }}
            accessibilityLabel={a.label}
            style={[styles.row, { backgroundColor: t.surface2 }]}
          >
            <Icon name={a.icon} size={22} color={a.destructive ? t.danger : t.text} />
            <Text style={[styles.label, { color: a.destructive ? t.danger : t.text }]}>{a.label}</Text>
          </Press>
        ))}
        <Press onPress={onClose} accessibilityLabel="Cancel" style={styles.cancel}>
          <Text style={[styles.cancelText, { color: t.text2 }]}>Cancel</Text>
        </Press>
      </Animated.View>
    </View>
  );
}

/** A short list of choices rising from the bottom — Android's Alert allows
 *  only three buttons, and these want icons. */
export function ActionSheet({ open, title, actions, onClose }) {
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>{open ? <Sheet title={title} actions={actions} onClose={onClose} /> : null}</SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, gap: 8 },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 8 },
  title: { ...TYPE.heading, marginBottom: 6, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, borderRadius: 16, paddingHorizontal: 16 },
  label: { fontFamily: F.bold, fontSize: 16 },
  cancel: { minHeight: 52, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: F.bold, fontSize: 16 },
});
