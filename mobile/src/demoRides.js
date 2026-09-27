import { energyStats } from "./ride.js"; // extension kept so this file runs under plain Node too

/**
 * Fake history, for looking at the screens that only exist once there is one.
 *
 * Pack health, the trend, lifetime totals and streaks are all invisible on a
 * fresh install, which makes them impossible to judge without a fortnight of
 * riding first. These rides fill that in.
 *
 * Two rules keep it honest. Every ride is marked `demo: true` so it can be
 * removed again without touching real ones, and the energy figures go through
 * the same `energyStats` the app uses — seeded data that took a shortcut would
 * be testing a screen against numbers the app cannot actually produce.
 */

/** Deterministic on purpose: the same history every time, so a change in what
 *  the screen shows is a change in the code and not in the dice.
 *
 *  Efficiency worsens down the list because the list runs oldest first — that
 *  is the fade the app exists to measure. */
const PLAN = [
  // Weekend rides long enough to measure — a third to two thirds of the pack,
  // mostly in the middle mode, the way most people ride.
  { daysAgo: 91, km: 30.0, whPerKm: 8.1, avgKmh: 21.8, ascent: 64, mode: "normal", w: [27, 0, 8] },
  { daysAgo: 84, km: 28.5, whPerKm: 8.1, avgKmh: 20.9, ascent: 52, mode: "normal", w: [29, 1, 6] },
  { daysAgo: 77, km: 31.0, whPerKm: 8.2, avgKmh: 22.4, ascent: 88, mode: "normal", w: [31, 0, 5] },
  { daysAgo: 70, km: 29.0, whPerKm: 8.3, avgKmh: 21.0, ascent: 47, mode: "normal", w: [26, 2, 12] },
  { daysAgo: 63, km: 30.5, whPerKm: 8.4, avgKmh: 21.6, ascent: 71, mode: "normal", w: [28, 1, 9] },
  { daysAgo: 60, km: 5.2, whPerKm: 7.9, avgKmh: 16.4, ascent: 12, mode: "eco", w: [24, 3, 14] },
  { daysAgo: 56, km: 28.0, whPerKm: 8.6, avgKmh: 20.2, ascent: 45, mode: "normal", w: [30, 0, 7] },
  { daysAgo: 49, km: 31.5, whPerKm: 8.8, avgKmh: 22.1, ascent: 93, mode: "normal", w: [25, 2, 18] },
  // A fast one and a slow one, so the modes have something to compare —
  // Sport a third hungrier than Normal, Eco a fifth thriftier.
  { daysAgo: 45, km: 18.0, whPerKm: 12.0, avgKmh: 26.8, ascent: 40, mode: "sport", w: [27, 1, 10] },
  { daysAgo: 42, km: 29.5, whPerKm: 9.1, avgKmh: 21.3, ascent: 58, mode: "normal", w: [23, 3, 16] },
  { daysAgo: 35, km: 30.0, whPerKm: 9.4, avgKmh: 20.7, ascent: 61, mode: "normal", w: [22, 1, 11] },
  { daysAgo: 33, km: 4.8, whPerKm: 8.1, avgKmh: 15.9, ascent: 9, mode: "eco", w: [19, 61, 17] },
  { daysAgo: 28, km: 28.5, whPerKm: 9.7, avgKmh: 21.5, ascent: 49, mode: "normal", w: [21, 2, 9] },
  { daysAgo: 24, km: 20.0, whPerKm: 8.1, avgKmh: 16.8, ascent: 31, mode: "eco", w: [20, 0, 6] },
  { daysAgo: 21, km: 31.0, whPerKm: 10.0, avgKmh: 22.0, ascent: 77, mode: "normal", w: [18, 3, 21] },
  { daysAgo: 14, km: 29.0, whPerKm: 10.3, avgKmh: 20.6, ascent: 53, mode: "normal", w: [17, 2, 13] },
  { daysAgo: 7, km: 30.5, whPerKm: 10.5, avgKmh: 21.2, ascent: 66, mode: "normal", w: [16, 1, 10] },
  // Short hops this week: they count towards the goal.
  { daysAgo: 0, hoursAgo: 5, km: 6.8, whPerKm: 8.6, avgKmh: 16.3, ascent: 14, mode: "eco", w: [15, 2, 9] },
  { daysAgo: 0, hoursAgo: 1, km: 9.4, whPerKm: 12.8, avgKmh: 25.8, ascent: 21, mode: "sport", w: [14, 3, 15] },
];

const DAY_MS = 86400000;

/** A plausible loop, so the map has something to draw.
 *
 *  A circle with a slow wobble on it: closed like a real out-and-back ride,
 *  irregular enough not to look like a compass drawing, and sized so its
 *  perimeter is roughly the distance the ride claims. */
function loop(centerLat, centerLon, distanceM, seed) {
  const radiusM = distanceM / (2 * Math.PI);
  const steps = Math.min(260, Math.max(40, Math.round(distanceM / 60)));
  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);

  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    // Two harmonics: enough to read as streets, not enough to read as noise.
    const wobble = 1 + 0.22 * Math.sin(3 * a + seed) + 0.08 * Math.sin(5 * a - seed);
    const r = radiusM * wobble;
    pts.push([
      centerLat + (Math.sin(a) * r * 0.72) / mPerDegLat,
      centerLon + (Math.cos(a) * r) / mPerDegLon,
    ]);
  }
  return pts;
}

export function buildDemoRides(packWh, now = Date.now()) {
  const pack = Number(packWh) > 0 ? Number(packWh) : 500;

  return PLAN.map(({ daysAgo, hoursAgo = 1, km, whPerKm, avgKmh, ascent, mode, w }) => {
    const distance = km * 1000;
    // Back out the two numbers a rider would actually have typed, rounded to
    // whole percent the way a gauge reads — so the seeded ride carries the
    // same quantisation error a real one does.
    const usedPct = Math.max(1, Math.round(((whPerKm * km) / pack) * 100));
    const batteryStart = Math.min(100, 40 + usedPct + ((daysAgo * 7) % 25));
    const batteryEnd = batteryStart - usedPct;

    const movingTime = (km / avgKmh) * 3600;
    const startedAt = now - daysAgo * DAY_MS - hoursAgo * 3600000;

    return {
      id: `demo-${daysAgo}-${hoursAgo}`,
      demo: true,
      startedAt,
      distance,
      movingTime,
      // Traffic: a quarter of a ride is spent not moving.
      elapsed: movingTime * 1.27,
      topSpeed: (avgKmh + 6.5) / 3.6,
      ascent,
      gaps: 0,
      // Bucharest, nudged a little per ride so nine loops are not one loop
      // drawn nine times.
      track: loop(44.43 + (daysAgo % 5) * 0.004, 26.10 + (daysAgo % 7) * 0.005, distance, daysAgo),
      scooter: "My scooter",
      mode,
      energy: energyStats({ batteryStart, batteryEnd, packWh: pack, distanceM: distance }),
      // Summer into autumn in Bucharest: [°C, WMO code, wind km/h].
      weather: w ? { t: startedAt, tempC: w[0], code: w[1], windKmh: w[2], precipMm: w[1] >= 51 ? 1.2 : 0 } : null,
    };
  }).sort((a, b) => b.startedAt - a.startedAt); // newest first, as stored
}
