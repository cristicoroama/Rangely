// Extensions kept so the tests can import this under plain Node.
import { isEnergySample, packHealth } from "./ride.js";

/**
 * Riding modes: how hard the rider asked the scooter to go.
 *
 * Every maker names them differently — Segway's ECO / D / S, Xiaomi's D / S /
 * S+, KuKirin's gears 1 / 2 / 3, Dualtron's Eco and Turbo buttons — but they
 * fall into four kinds, and the energy difference between them is large:
 * the makers' own figures put the fastest mode at 25–55 % more battery per
 * kilometre than the slowest (Segway Max G2: ECO 70 km, D 50 km, S 45 km on
 * one charge). So the app records the kind, shows the rider the name on
 * their own dashboard, and measures the difference from their own rides.
 *
 * Walking mode is left out on purpose: nobody records a ride at 6 km/h.
 */
export const MODES = {
  eco: { key: "eco", name: "Eco", colors: ["#22D98E", "#12B8C9"] },
  normal: { key: "normal", name: "Normal", colors: ["#2FB8FF", "#5B6CFF"] },
  sport: { key: "sport", name: "Sport", colors: ["#FF8A3D", "#FF4D6D"] },
  turbo: { key: "turbo", name: "Turbo", colors: ["#D946EF", "#8B5CFF"] },
};
export const MODE_ORDER = ["eco", "normal", "sport", "turbo"];

/** What each brand prints on the handlebar, mapped to the four kinds. */
const BRAND_MODES = {
  Xiaomi: [
    { mode: "normal", label: "D" },
    { mode: "sport", label: "S" },
    { mode: "turbo", label: "S+" },
  ],
  Segway: [
    { mode: "eco", label: "ECO" },
    { mode: "normal", label: "D" },
    { mode: "sport", label: "S" },
  ],
  NIU: [
    { mode: "eco", label: "E-Save" },
    { mode: "sport", label: "Sport" },
  ],
  Navee: [
    { mode: "eco", label: "1" },
    { mode: "normal", label: "2 · D" },
    { mode: "sport", label: "3 · S" },
  ],
  KuKirin: [
    { mode: "eco", label: "1 · Eco" },
    { mode: "normal", label: "2 · Sport" },
    { mode: "sport", label: "3 · Race" },
  ],
  Dualtron: [
    { mode: "eco", label: "Eco" },
    { mode: "normal", label: "Gear 1–2" },
    { mode: "sport", label: "Gear 3+" },
    { mode: "turbo", label: "Turbo" },
  ],
};

const GENERIC = MODE_ORDER.map((m) => ({ mode: m, label: MODES[m].name }));

/** The modes a scooter offers, labelled the way its dashboard labels them. */
export function modesFor(preset) {
  const list = (preset && BRAND_MODES[preset.brand]) || GENERIC;
  // Only the Xiaomi 5 Pro and 5 Max have S+.
  if (preset?.brand === "Xiaomi" && preset.key !== "xiaomi-5") return list.filter((m) => m.mode !== "turbo");
  return list;
}

/** The label for a recorded ride's mode, on this scooter. */
export function modeLabel(preset, mode) {
  return modesFor(preset).find((m) => m.mode === mode)?.label ?? MODES[mode]?.name ?? null;
}

/** A sensible starting mode: the middle one, which is what most people ride. */
export function defaultMode(preset) {
  const list = modesFor(preset);
  return (list.find((m) => m.mode === "normal") ?? list[0]).mode;
}

/**
 * Range and consumption per mode, from the rider's own measured rides —
 * pooled as total kilometres over total battery, like pack health, so a long
 * ride counts for more than a short one.
 */
export function modeStats(rides) {
  const groups = {};
  for (const r of rides || []) {
    if (!MODES[r.mode] || !isEnergySample(r)) continue;
    const g = (groups[r.mode] ||= { mode: r.mode, rides: 0, km: 0, pct: 0 });
    g.rides += 1;
    g.km += (r.distance || 0) / 1000;
    g.pct += r.energy.usedPct;
  }
  return MODE_ORDER.filter((m) => groups[m]).map((m) => {
    const g = groups[m];
    return { ...g, kmPerPct: g.km / g.pct, rangeKm: (100 * g.km) / g.pct };
  });
}

/**
 * The headline comparison: how much more battery per kilometre the hungriest
 * measured mode takes than the thriftiest. Null until two modes have data.
 */
export function modeInsight(stats) {
  if (!stats || stats.length < 2) return null;
  const best = stats.reduce((a, b) => (b.kmPerPct > a.kmPerPct ? b : a));
  const worst = stats.reduce((a, b) => (b.kmPerPct < a.kmPerPct ? b : a));
  if (best.mode === worst.mode) return null;
  return { best, worst, extraPct: (best.kmPerPct / worst.kmPerPct - 1) * 100 };
}

/**
 * Pack health, compared like with like where the data allows: if one mode
 * has enough riding on its own, health is measured on that mode alone;
 * otherwise on everything, and `mode` is null.
 */
export function healthFor(rides, { windowPct = 300 } = {}) {
  const pct = {};
  for (const r of rides || []) {
    if (MODES[r.mode] && isEnergySample(r)) pct[r.mode] = (pct[r.mode] || 0) + r.energy.usedPct;
  }
  const top = Object.keys(pct).sort((a, b) => pct[b] - pct[a])[0];
  if (top && pct[top] >= 2 * windowPct) {
    const h = packHealth(rides, { windowPct, mode: top });
    if (h?.baseline) return { ...h, mode: top };
  }
  const all = packHealth(rides, { windowPct });
  return all ? { ...all, mode: null } : null;
}
