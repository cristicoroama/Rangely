import { useId } from "react";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { useTheme } from "../theme";

/**
 * Rangely's scooter: an original drawing, no particular make. Deck and stem
 * in the brand gradient, dark tyres with a lit hub, a headlight, and three
 * speed lines behind it. Scales from an empty-state icon to a hero picture.
 *
 * `onHero` switches the tyres and bars to colours that hold up on the dark
 * panel.
 */
export function ScooterArt({ width = 220, onHero, motion = true }) {
  const t = useTheme();
  const id = `s${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const tyre = onHero ? "#0D1714" : t.scheme === "light" ? "#1E262B" : "#0B0F12";
  const tyreEdge = onHero ? "rgba(255,255,255,0.22)" : t.scheme === "light" ? "#3A454C" : "#39434C";
  const metal = onHero ? "#E9F6F1" : t.scheme === "light" ? "#2C363C" : "#D5DDE3";
  const lines = onHero ? "rgba(255,255,255,0.35)" : t.lineStrong;
  const height = (width * 140) / 220;

  return (
    <Svg width={width} height={height} viewBox="0 0 220 140">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={t.grad[0]} />
          <Stop offset="1" stopColor={t.grad[1]} />
        </LinearGradient>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFE38A" stopOpacity="0" />
          <Stop offset="1" stopColor="#FFE38A" stopOpacity="0.55" />
        </LinearGradient>
      </Defs>

      {motion ? (
        <G stroke={lines} strokeWidth={4} strokeLinecap="round">
          <Path d="M8 70 H40" />
          <Path d="M2 86 H30" />
          <Path d="M14 102 H36" />
        </G>
      ) : null}

      {/* headlight beam */}
      <Path d="M168 38 L214 22 L214 58 Z" fill={`url(#${id}g)`} />

      {/* rear fender */}
      <Path d="M44 100 A 24 24 0 0 1 88 96" stroke={metal} strokeWidth={5} fill="none" strokeLinecap="round" />

      {/* wheels */}
      <Circle cx={66} cy={112} r={22} fill={tyre} stroke={tyreEdge} strokeWidth={2} />
      <Circle cx={66} cy={112} r={9} fill={`url(#${id})`} />
      <Circle cx={186} cy={112} r={22} fill={tyre} stroke={tyreEdge} strokeWidth={2} />
      <Circle cx={186} cy={112} r={9} fill={`url(#${id})`} />

      {/* deck */}
      <Rect x={60} y={94} width={112} height={13} rx={6.5} fill={`url(#${id})`} />

      {/* stem and fork */}
      <Path d="M168 100 L150 26" stroke={`url(#${id})`} strokeWidth={10} strokeLinecap="round" />
      <Path d="M170 100 L186 112" stroke={metal} strokeWidth={6} strokeLinecap="round" />

      {/* handlebar */}
      <Path d="M132 24 H170" stroke={metal} strokeWidth={7} strokeLinecap="round" />
      <Path d="M130 24 H138" stroke={tyre} strokeWidth={9} strokeLinecap="round" />

      {/* headlight */}
      <Circle cx={160} cy={42} r={5.5} fill="#FFE38A" stroke={metal} strokeWidth={2} />
    </Svg>
  );
}
