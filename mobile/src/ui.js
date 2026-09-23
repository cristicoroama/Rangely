import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Polyline, Stop } from "react-native-svg";

import { F, TYPE, useTheme } from "./theme";
import { GradientFill } from "./components/Gradient";
import { DUR, SPRING } from "./motion";
import { haptic } from "./haptics";

/**
 * Styles made once per theme, not once per render. Every component asks for
 * its styles through one of these, so a light/dark switch costs two
 * StyleSheets per component for the life of the app.
 */
export function themed(make) {
  const cache = {};
  return function useStyles() {
    const t = useTheme();
    if (!cache[t.scheme]) cache[t.scheme] = make(t);
    return [cache[t.scheme], t];
  };
}

/* ------------------------------------------------------------------ icons -- */

/**
 * Icons, drawn rather than installed: a handful of paths on a 24-grid, stroked
 * in the colour of the text beside them so an icon can never disagree with its
 * label. An icon font would be a megabyte for the twenty glyphs used here.
 */
const ICONS = {
  route: "M6 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 10c0 4-12 0-12 4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  speed: "M12 20a8 8 0 1 1 8-8M12 12l5-3",
  hill: "M2 19h20L15 7l-4 6-3-3.5z",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6z",
  battery: "M4 8h12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM20 11v2",
  trend: "M3 17l6-6 4 4 8-8M21 7v5h-5",
  play: "M8 5.5v13l10.5-6.5z",
  pause: "M8 5h3v14H8zM13 5h3v14h-3z",
  stop: "M7 7h10v10H7z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  close: "M6 6l12 12M18 6 6 18",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z",
  scooter: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7 17h10M14 5h3l1.5 12M14 5l-1 0",
  helmet: "M4 15a8 8 0 0 1 16 0v1H4zM12 7v4M4 16h9l2 3H6",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  light: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z",
  warning: "M12 4 2.5 20h19zM12 10v4M12 17h.01",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z",
  flame: "M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.4-4.6.2 1.6.9 2.6 1.9 3.1C11 9.2 11 6 12 3z",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.6-1.6M18.4 5.6l1.4-1.4",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9.5h-13z",
  sparkle: "M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  calendar: "M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4",
};

const FILLED = new Set(["bolt", "hill", "play", "pause", "stop", "flame", "star", "sparkle"]);

export function Icon({ name, size = 16, color, strokeWidth = 2 }) {
  const t = useTheme();
  const d = ICONS[name];
  if (!d) return null;
  const c = color ?? t.text2;
  const filled = FILLED.has(name);
  // Wrapped in a View so it stacks like every other view: on the web a bare
  // <svg> paints beneath positioned siblings, which hid icons on gradients.
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={d}
          fill={filled ? c : "none"}
          stroke={c}
          strokeWidth={filled ? 0 : strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/* ------------------------------------------------------------------ press -- */

/**
 * Anything tappable. It sinks a few percent under the finger in about a tenth
 * of a second and springs back — the whole of the feedback most taps need —
 * and can add a haptic for the ones that change something.
 */
export function Press({ onPress, onLongPress, disabled, style, outerStyle, children, scaleTo = 0.97, feel, hitSlop, accessibilityLabel, accessibilityRole = "button" }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={
        onPress &&
        (() => {
          if (feel) haptic[feel]?.();
          onPress();
        })
      }
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withTiming(scaleTo, { duration: DUR.press });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING.snappy);
      }}
      disabled={disabled}
      style={outerStyle}
      hitSlop={hitSlop ?? 6}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Animated.View style={[style, anim, disabled && { opacity: 0.45 }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ----------------------------------------------------------------- button -- */

const useButtonStyles = themed((t) =>
  StyleSheet.create({
    base: {
      minHeight: 56,
      borderRadius: 18,
      paddingHorizontal: 22,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
    },
    big: { minHeight: 72, borderRadius: 22 },
    small: { minHeight: 44, borderRadius: 14, paddingHorizontal: 16 },
    primary: {
      backgroundColor: t.grad[0],
      overflow: "hidden",
      boxShadow: t.scheme === "light" ? "0px 10px 24px rgba(20,170,120,0.35)" : "0px 8px 28px rgba(34,217,142,0.28)",
    },
    danger: { backgroundColor: t.dangerFill },
    secondary: { backgroundColor: t.surface2, borderWidth: 1, borderColor: t.line },
    ghost: { backgroundColor: "transparent" },
    text: { ...TYPE.button },
    textBig: { fontSize: 19, letterSpacing: 0.3 },
    textSmall: { fontSize: 15 },
  }),
);

/** `outerStyle` places the button (flex, margins); `style` dresses it. */
export function Button({ title, onPress, tone = "primary", size = "normal", icon, disabled, feel = "light", style, outerStyle }) {
  const [s, t] = useButtonStyles();
  const ink =
    tone === "primary" ? t.gradInk : tone === "danger" ? "#FFFFFF" : tone === "ghost" ? t.text2 : t.text;
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      feel={feel}
      accessibilityLabel={title}
      outerStyle={outerStyle}
      style={[s.base, size === "big" && s.big, size === "small" && s.small, s[tone], style]}
    >
      {tone === "primary" ? <GradientFill colors={t.grad} dir="across" /> : null}
      {icon ? <Icon name={icon} size={size === "big" ? 22 : 18} color={ink} /> : null}
      <Text style={[s.text, size === "big" && s.textBig, size === "small" && s.textSmall, { color: ink }]}>
        {title}
      </Text>
    </Press>
  );
}

/* ------------------------------------------------------------ typography -- */

const useTextStyles = themed((t) =>
  StyleSheet.create({
    label: { ...TYPE.label, color: t.text3 },
    body: { ...TYPE.body, color: t.text2 },
    strong: { ...TYPE.bodyStrong, color: t.text },
    small: { ...TYPE.small, color: t.text3 },
    heading: { ...TYPE.heading, color: t.text },
    title: { ...TYPE.title, color: t.text },
  }),
);

/** Text in one of the scale's roles. */
export function Txt({ role = "body", style, children, ...rest }) {
  const [s] = useTextStyles();
  return (
    <Text style={[s[role], style]} {...rest}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------- card -- */

const useCardStyles = themed((t) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: t.radius,
      padding: t.pad,
      borderWidth: t.scheme === "light" ? 0 : 1,
      borderColor: t.line,
      // Light cards float on a soft, wide shadow; dark ones on a hairline,
      // because a shadow on near-black is invisible and a border on white is
      // fussy.
      boxShadow: t.cardShadow,
    },
    flat: { backgroundColor: t.surface2, boxShadow: "none", borderWidth: 0 },
    accent: { backgroundColor: t.accentWash, boxShadow: "none", borderWidth: 0 },
    warn: { backgroundColor: t.warnWash, boxShadow: "none", borderWidth: 0 },
  }),
);

export function Card({ children, style, tone }) {
  const [s] = useCardStyles();
  return <View style={[s.card, tone && s[tone], style]}>{children}</View>;
}

/* ------------------------------------------------------------------- stat -- */

const useStatStyles = themed((t) =>
  StyleSheet.create({
    stat: { flex: 1, minWidth: 80 },
    row: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    value: { ...TYPE.value, color: t.text },
    big: { ...TYPE.display },
    unit: { fontFamily: F.bold, fontSize: 13, color: t.text3 },
    unitBig: { fontSize: 20 },
    labelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  }),
);

/** A number with its label. The unit sits beside the value, smaller, so a row
 *  of these lines up on the digits and not on the units. */
export function Stat({ label, value, unit, icon, big, tone, style, onHero }) {
  const [s, t] = useStatStyles();
  const color = onHero
    ? t.onHero
    : tone === "accent" ? t.accent : tone === "danger" ? t.danger : tone === "warn" ? t.warn : t.text;
  return (
    <View style={[s.stat, style]} accessible accessibilityLabel={`${label}: ${value}${unit ? " " + unit : ""}`}>
      <View style={s.row}>
        <Text style={[s.value, big && s.big, { color }]} maxFontSizeMultiplier={1.3}>
          {value}
        </Text>
        {unit ? <Text style={[s.unit, big && s.unitBig, onHero && { color: t.onHero3 }]}>{unit}</Text> : null}
      </View>
      <View style={s.labelRow}>
        {icon ? <Icon name={icon} size={12} color={onHero ? t.onHero3 : t.text3} /> : null}
        <Txt role="label" style={onHero && { color: t.onHero3 }}>{label}</Txt>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------- pill -- */

const usePillStyles = themed((t) =>
  StyleSheet.create({
    pill: {
      flexDirection: "row", alignItems: "center", gap: 6,
      borderRadius: t.pill, paddingHorizontal: 11, paddingVertical: 5,
      backgroundColor: t.surface2,
    },
    accent: { backgroundColor: t.accentWash },
    warn: { backgroundColor: t.warnWash },
    danger: { backgroundColor: t.dangerWash },
    aqua: { backgroundColor: t.aquaWash },
    hero: { backgroundColor: t.heroFill },
    text: { fontFamily: F.bold, fontSize: 12, letterSpacing: 0.3, color: t.text2 },
  }),
);

/** A state, not an action. Carries an icon as well as a colour, so it reads
 *  for someone who cannot tell green from red. */
export function Pill({ children, tone, icon }) {
  const [s, t] = usePillStyles();
  const color =
    tone === "accent" ? t.accent : tone === "warn" ? t.warn : tone === "danger" ? t.danger
      : tone === "aqua" ? t.aqua : tone === "hero" ? t.onHero : t.text2;
  return (
    <View style={[s.pill, tone && s[tone]]}>
      {icon ? <Icon name={icon} size={13} color={color} /> : null}
      <Text style={[s.text, { color }]}>{children}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- section -- */

export function SectionTitle({ children, right, style }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 12 }, style]}>
      <Txt role="label">{children}</Txt>
      {right}
    </View>
  );
}

/* -------------------------------------------------------------- sparkline -- */

/** A trend as a line with its ground filled in, the latest point marked —
 *  the value a rider cares about is this week's. The marker is a View laid
 *  over the drawing rather than an SVG circle, because the drawing stretches
 *  to fit and a stretched circle is an egg. */
export function Sparkline({ values, height = 52 }) {
  const t = useTheme();
  const nums = (values || []).filter((v) => Number.isFinite(v));
  if (nums.length < 2) return null;

  const W = 100;
  const H = 36;
  const pad = 3;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const pts = nums.map((v, i) => [(i / (nums.length - 1)) * W, H - pad - ((v - min) / span) * (H - pad * 2)]);
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `M0,${H} L${line.split(" ").join(" L")} L${W},${H} Z`;
  const ly = pts[pts.length - 1][1];

  return (
    <View style={{ height, marginTop: 14 }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={t.grad[1]} />
            <Stop offset="1" stopColor={t.grad[0]} />
          </LinearGradient>
          <LinearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.grad[0]} stopOpacity="0.28" />
            <Stop offset="1" stopColor={t.grad[0]} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#sparkArea)" />
        <Polyline
          points={line}
          fill="none"
          stroke="url(#spark)"
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
      <View
        pointerEvents="none"
        style={{
          position: "absolute", right: -4, top: (ly / H) * height - 4,
          width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent,
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------- icon tile -- */

const TILE_TONES = {
  green: (t) => ({ bg: t.accentWash, fg: t.accent }),
  aqua: (t) => ({ bg: t.aquaWash, fg: t.aqua }),
  warn: (t) => ({ bg: t.warnWash, fg: t.warn }),
  danger: (t) => ({ bg: t.dangerWash, fg: t.danger }),
  grey: (t) => ({ bg: t.surface2, fg: t.text2 }),
  hero: (t) => ({ bg: t.heroFill, fg: t.onHero }),
};

/** An icon in a tinted rounded square — the colour that tells sections apart
 *  at a glance, the way a phone's own settings do. `tone="grad"` fills it
 *  with the brand gradient for the few things that deserve it. */
export function IconTile({ name, tone = "green", size = 40, icon = 20, style }) {
  const t = useTheme();
  const grad = tone === "grad";
  const c = grad ? { bg: t.grad[0], fg: t.gradInk } : (TILE_TONES[tone] ?? TILE_TONES.green)(t);
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size * 0.32, alignItems: "center", justifyContent: "center", backgroundColor: c.bg, overflow: "hidden" },
        style,
      ]}
    >
      {grad ? <GradientFill colors={t.grad} /> : null}
      <Icon name={name} size={icon} color={c.fg} strokeWidth={2.2} />
    </View>
  );
}
