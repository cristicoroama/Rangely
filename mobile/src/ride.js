/**
 * Ride maths. Pure functions, no React and no device APIs, so the part that
 * decides whether the numbers are true can be tested without a phone.
 *
 * Three things here exist because the naive version of each is wrong:
 *
 *   1. Distance is integrated from positions, never taken from the GPS chip's
 *      own odometer, because there isn't one — and summing raw fixes without
 *      gating on accuracy inflates every ride, since a drifting fix while you
 *      stand still still "moves".
 *   2. Moving time is tracked apart from elapsed time. Two minutes at a red
 *      light is not riding, and averaging over it makes every speed a lie.
 *   3. Top speed comes from a smoothed window, not a single sample. One bad
 *      fix reports 90 km/h on a scooter, and that is exactly the number people
 *      screenshot.
 */

/** Fixes worse than this are dropped outright (metres). A phone in a pocket
 *  under trees reports 50-100m and those points are pure noise. */
export const MAX_ACCURACY_M = 25;

/** Above this, a segment is a GPS jump rather than a ride (m/s ≈ 90 km/h).
 *  Deliberately generous: some scooters genuinely do 60-70. */
export const MAX_PLAUSIBLE_MS = 25;

/** Below this you are standing, pushing, or drifting (m/s ≈ 3.6 km/h). */
export const MOVING_THRESHOLD_MS = 1.0;

/** Samples averaged for top speed. At ~1Hz this is a three-second window —
 *  long enough to reject a single wild fix, short enough to keep a real
 *  sprint. */
const SPEED_WINDOW = 3;

const R = 6371000; // Earth radius, metres
const rad = (d) => (d * Math.PI) / 180;

/** Great-circle distance between two fixes, in metres. */
export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Should this fix be trusted at all? */
export function isUsable(p) {
  return (
    p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    Number.isFinite(p.t) &&
    (p.accuracy == null || p.accuracy <= MAX_ACCURACY_M)
  );
}

/**
 * Fold one new fix into a running total.
 *
 * Incremental rather than recomputed from the whole array: this runs once a
 * second for the length of a ride, and re-reducing thousands of points every
 * tick would heat the phone for no reason.
 *
 * `state` is immutable in, immutable out.
 */
export function addPoint(state, p) {
  if (!isUsable(p)) return state;

  const prev = state.last;
  if (!prev) {
    return { ...state, last: p, startedAt: state.startedAt ?? p.t, points: [p] };
  }

  const dt = (p.t - prev.t) / 1000;
  if (dt <= 0) return state; // out-of-order or duplicate fix

  const dist = haversine(prev, p);
  const speed = dist / dt;

  // A jump: teleported across town between two fixes. Keep it as the new
  // anchor — the phone is there now — but do not count the distance, or one
  // tunnel exit adds a kilometre you never rode.
  if (speed > MAX_PLAUSIBLE_MS) {
    return { ...state, last: p, points: [...state.points, p] };
  }

  const moving = speed >= MOVING_THRESHOLD_MS;
  const window = [...state.speedWindow, speed].slice(-SPEED_WINDOW);
  const smoothed = window.reduce((a, b) => a + b, 0) / window.length;

  return {
    ...state,
    last: p,
    points: [...state.points, p],
    // Standing still still produces small drifting deltas; not counting them
    // is what keeps a ride's distance honest while you wait at a crossing.
    distance: state.distance + (moving ? dist : 0),
    movingTime: state.movingTime + (moving ? dt : 0),
    elapsed: (p.t - (state.startedAt ?? p.t)) / 1000,
    topSpeed: Math.max(state.topSpeed, smoothed),
    speedWindow: window,
    // Only climbs count; GPS altitude is noisy enough that summing both
    // directions produces a number with no meaning.
    ascent:
      state.ascent +
      (Number.isFinite(p.alt) && Number.isFinite(prev.alt) && p.alt > prev.alt
        ? p.alt - prev.alt
        : 0),
  };
}

export function emptyRide() {
  return {
    startedAt: null,
    last: null,
    points: [],
    distance: 0,   // metres
    movingTime: 0, // seconds actually moving
    elapsed: 0,    // seconds since the first fix
    topSpeed: 0,   // m/s, smoothed
    ascent: 0,     // metres climbed
    speedWindow: [],
  };
}

/** Average speed over MOVING time, which is the one riders mean. */
export function avgSpeed(state) {
  return state.movingTime > 0 ? state.distance / state.movingTime : 0;
}

export const msToKmh = (ms) => ms * 3.6;

export function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function fmtDistance(metres) {
  return metres >= 1000
    ? `${(metres / 1000).toFixed(2)} km`
    : `${Math.round(metres)} m`;
}

/**
 * Energy used, from the two battery readings the rider types in.
 *
 * Percentages alone say nothing comparable — 20% of a 250Wh pack is not 20% of
 * a 600Wh one — so the pack size turns them into watt-hours, and watt-hours
 * over distance is the number that lets two different scooters be compared at
 * all. This is the figure the whole app exists for.
 */
export function energyStats({ batteryStart, batteryEnd, packWh, distanceM }) {
  if (
    !Number.isFinite(batteryStart) ||
    !Number.isFinite(batteryEnd) ||
    !Number.isFinite(packWh) ||
    packWh <= 0 ||
    distanceM <= 0
  ) {
    return null;
  }
  const usedPct = batteryStart - batteryEnd;
  if (usedPct <= 0) return null; // charged mid-ride, or a typo

  const wh = (usedPct / 100) * packWh;
  const km = distanceM / 1000;
  const whPerKm = wh / km;
  return {
    usedPct,
    wh,
    whPerKm,
    // What a full pack would take you, at the efficiency of THIS ride. Honest
    // because it is measured, not the range printed on the box.
    estimatedRangeKm: whPerKm > 0 ? packWh / whPerKm : null,
  };
}
