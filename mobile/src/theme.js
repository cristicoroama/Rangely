import { useColorScheme } from "react-native";

/**
 * Two palettes, chosen by the phone, and one brand that runs through both.
 *
 * The app follows the system — light by day, dark at night — because a dark
 * screen at noon on a handlebar reflects enough sun to take grey-on-black
 * down to about 1.4 : 1. The light palette is the one tuned for the hard
 * case: near-black on near-white, no grey for anything that matters while
 * moving.
 *
 * What makes it look like *this* app rather than a settings page is the
 * electric gradient — green running into aqua — used sparingly: the goal
 * ring, the start button, earned badges and the hero panels. Everything else
 * stays calm so those few things glow.
 */
const shared = {
  radius: 24,
  radiusSm: 16,
  radiusXs: 12,
  pill: 999,
  pad: 18,
  gap: 12,
  tabular: { fontVariant: ["tabular-nums"] },

  // The brand: green into aqua. Dark ink sits on it (white on this green is
  // under 2 : 1).
  grad: ["#22D98E", "#12B8C9"],
  gradInk: "#03140C",
  // The hero panels: deep, nearly-black green into ink blue, lit from two
  // corners. Same in both themes — they are the one place the light theme
  // goes dark, and that contrast is the point.
  hero: ["#0B3A2B", "#0A2436"],
  heroGlowA: "rgba(34,217,142,0.55)",
  heroGlowB: "rgba(18,184,201,0.45)",
  onHero: "#FFFFFF",
  onHero2: "rgba(255,255,255,0.74)",
  onHero3: "rgba(255,255,255,0.52)",
  heroLine: "rgba(255,255,255,0.14)",
  heroFill: "rgba(255,255,255,0.10)",
};

export const LIGHT = {
  ...shared,
  scheme: "light",
  bg: "#F1F3F2",
  surface: "#FFFFFF",
  surface2: "#EAEEEC",
  line: "#DDE2DF",
  lineStrong: "#C5CCC8",
  text: "#0B0F12",
  text2: "#414A52",
  text3: "#69727B",
  accent: "#0F8249",
  accentFill: "#1ECB7F",
  accentInk: "#03140C",
  accentWash: "rgba(30,203,127,0.14)",
  aqua: "#0B7F8C",
  aquaWash: "rgba(18,184,201,0.13)",
  danger: "#CC3328",
  dangerFill: "#EF4B3F",
  dangerWash: "rgba(204,51,40,0.10)",
  warn: "#9A5F08",
  warnFill: "#F5A524",
  warnWash: "rgba(245,165,36,0.16)",
  shadow: "rgba(12,15,18,0.08)",
  cardShadow: "0px 6px 20px rgba(11,15,18,0.07)",
  statusBar: "dark",
};

export const DARK = {
  ...shared,
  scheme: "dark",
  bg: "#090B0D",
  surface: "#13171B",
  surface2: "#1B2026",
  line: "#252B32",
  lineStrong: "#343C46",
  text: "#F3F5F7",
  text2: "#B3BAC3",
  text3: "#808A95",
  accent: "#3BDB91",
  accentFill: "#22D98E",
  accentInk: "#03140C",
  accentWash: "rgba(59,219,145,0.13)",
  aqua: "#3FD0DE",
  aquaWash: "rgba(63,208,222,0.12)",
  danger: "#F2584D",
  dangerFill: "#EF4B3F",
  dangerWash: "rgba(242,88,77,0.13)",
  warn: "#F0B454",
  warnFill: "#F5A524",
  warnWash: "rgba(240,180,84,0.14)",
  shadow: "rgba(0,0,0,0.4)",
  cardShadow: "none",
  statusBar: "light",
};

export function useTheme() {
  return useColorScheme() === "dark" ? DARK : LIGHT;
}

/**
 * Two typefaces, bundled with the app.
 *
 * Plus Jakarta Sans for words: geometric, friendly without being childish,
 * with proper ș and ț. Barlow Condensed for numbers: tall and narrow, so the
 * distance on the ride screen can be 130 pt and still fit "12.46" across a
 * phone — the sporty, stencilled-on-a-jersey look. Both have true tabular
 * figures, so a number that changes every second does not wobble.
 *
 * Each weight is its own file and its own family name; `fontWeight` is never
 * combined with them, because Android fakes bold on top of a custom font.
 */
export const F = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semi: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  heavy: "PlusJakartaSans_800ExtraBold",
  num: "BarlowCondensed_700Bold",
  numHeavy: "BarlowCondensed_800ExtraBold",
};

export const FONT_FILES = {
  [F.regular]: require("../assets/fonts/PlusJakartaSans_400Regular.ttf"),
  [F.medium]: require("../assets/fonts/PlusJakartaSans_500Medium.ttf"),
  [F.semi]: require("../assets/fonts/PlusJakartaSans_600SemiBold.ttf"),
  [F.bold]: require("../assets/fonts/PlusJakartaSans_700Bold.ttf"),
  [F.heavy]: require("../assets/fonts/PlusJakartaSans_800ExtraBold.ttf"),
  [F.num]: require("../assets/fonts/BarlowCondensed_700Bold.ttf"),
  [F.numHeavy]: require("../assets/fonts/BarlowCondensed_800ExtraBold.ttf"),
};

const numbers = { fontVariant: ["tabular-nums"], includeFontPadding: false };

/**
 * One type scale. The ride screen gets the two biggest steps because it is
 * read from 60–80 cm away in under a second.
 */
export const TYPE = {
  hero: { fontFamily: F.numHeavy, fontSize: 136, lineHeight: 132, letterSpacing: -1.5, ...numbers },
  display: { fontFamily: F.numHeavy, fontSize: 72, lineHeight: 70, letterSpacing: -0.5, ...numbers },
  big: { fontFamily: F.numHeavy, fontSize: 44, lineHeight: 44, ...numbers },
  value: { fontFamily: F.num, fontSize: 30, lineHeight: 32, ...numbers },
  title: { fontFamily: F.heavy, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  heading: { fontFamily: F.bold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  body: { fontFamily: F.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: F.semi, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: F.bold, fontSize: 11.5, lineHeight: 16, letterSpacing: 1.2, textTransform: "uppercase" },
  button: { fontFamily: F.heavy, fontSize: 17, letterSpacing: 0.2 },
};
