import { Component } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { recordError } from "../crashLog";

/**
 * If a screen throws while drawing, show what happened instead of a blank
 * app, keep a copy of it (see crashLog.js), and offer a way back. Deliberately
 * plain — no theme, no fonts, no animation — because any of those could be
 * the thing that broke.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    recordError(error, false);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.text}>
            Your rides are safe. Take a screenshot of this and send it over — it says exactly what broke.
          </Text>
          <View style={styles.box}>
            <Text style={styles.code} selectable>
              {String(error?.message ?? error)}
              {"\n\n"}
              {String(error?.stack ?? "").split("\n").slice(0, 8).join("\n")}
            </Text>
          </View>
          <Pressable onPress={() => this.setState({ error: null })} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0C0E" },
  body: { padding: 24, paddingTop: 80, gap: 16 },
  title: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  text: { color: "#B3BAC3", fontSize: 16, lineHeight: 23 },
  box: { backgroundColor: "#1B2026", borderRadius: 14, padding: 14 },
  code: { color: "#F2B8B5", fontSize: 12, lineHeight: 17, fontFamily: "monospace" },
  button: { backgroundColor: "#22D98E", borderRadius: 18, minHeight: 56, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#03140C", fontSize: 17, fontWeight: "800" },
});
