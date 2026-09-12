/**
 * Ride maths. Pure functions, no React and no device APIs, so the part that
 * decides whether the numbers are true can be tested without a phone.
 *
 * Five things here exist because the naive version of each is wrong:
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
 *   4. A gap in the fixes is not a straight line. The app can be backgrounded,
 *      the signal can die in an underpass; joining the two ends of a five
 *      minute hole credits you with a kilometre at a perfectly plausible
 *      speed, which is the worst kind of wrong — undetectable in the total.
 *   5. Ascent needs hysteresis. GPS altitude wanders several metres while you
 *      stand still, and counting only the up-wanders turns noise into a
 *      mountain: a flat hour reports 200 m of climbing.
 */

/** Fixes worse than this are dropped outright (metres). A phone in a pocket
 *  under trees reports 50-100m and those points are pure noise. */
export const MAX_ACCURACY_M = 25;

/** Above this, a segment is a GPS jump rather than a ride (m/s ≈ 90 km/h).
 *  Deliberately generous: some scooters genuinely do 60-70. */
export const MAX_PLAUSIBLE_MS = 25;

/** Below this you are standing, pushing, or drifting (m/s ≈ 3.6 km/h). */
export const MOVING_THRESHOLD_MS = 1.0;

/** A hole longer than this is not a segment to integrate, it is missing data.
 *  At one fix a second, twenty seconds is already twenty lost samples. */
export const MAX_GAP_S = 20;

/** Altitude must move at least this far before it counts as climbing. Below
 *  it, the signal is noise (metres). */
export const ASCENT_THRESHOLD_M = 3;

/** Altitude fixes vaguer than this do not vote on ascent at all (metres).
 *  Many Android devices report no altitude accuracy; those are trusted, since
 *  the threshold above already absorbs ordinary wander. */
export const MAX_ALT_ACCURACY_M = 15;

/** Minimum spacing between kept track points (metres). The route is stored to
 *  be drawn, not to be re-integrated — distance comes from every fix, the
 *  track only has to look right on a map. */
export const TRACK_SPACING_M = 10;

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
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon) &&
    Number.isFinite(p.t) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180 &&
    (p.accuracy == null || p.accuracy <= MAX_ACCURACY_M)
  );
}

/** Keep the route sparse as it is recorded, rather than thinning it at save
 *  time — an hour of 1Hz fixes is thousands of points held in state for no
 *  reason. */
function foldTrack(track, p) {
  const last = track.length ? track[track.length - 1] : null;
  if (!last) return [[p.lat, p.lon]];
  if (haversine({ lat: last[0], lon: last[1] }, p) < TRACK_SPACING_M) return track;
  return [...track, [p.lat, p.lon]];
}

/**
 * Ascent with a dead band.
 *
 * `altRef` is the last altitude we believe. Climbing past it by more than the
 * threshold banks the difference and moves the reference up; dropping below it
 * by more than the threshold moves the reference down without crediting
 * anything. Inside the band nothing happens, which is what makes a flat ride
 * read as flat.
 */
function foldAscent(state, p) {
  const trusted =
    Number.isFinite(p.alt) &&
    (p.altAccuracy == null || p.altAccuracy <= MAX_ALT_ACCURACY_M);
  if (!trusted) return { ascent: state.ascent, altRef: state.altRef };

  if (state.altRef == null) return { ascent: state.ascent, altRef: p.alt };

  const d = p.alt - state.altRef;
  if (d >= ASCENT_THRESHOLD_M) return { ascent: state.ascent + d, altRef: p.alt };
  if (d <= -ASCENT_THRESHOLD_M) return { ascent: state.ascent, altRef: p.alt };
  return { ascent: state.ascent, altRef: state.altRef };
}

/** Continue the ride from this fix without joining it to the previous one.
 *  Used for jumps and for gaps: the phone is here now, but nothing about the
 *  space between the two points is known. */
function reanchor(state, p) {
  return {
    ...state,
    last: p,
    track: foldTrack(state.track, p),
    elapsed: (p.t - (state.startedAt ?? p.t)) / 1000,
    // A stale window would carry a speed from before the hole into the
    // smoothing of what comes after it.
    speedWindow: [],
    altRef: Number.isFinite(p.alt) ? p.alt : state.altRef,
    gaps: state.gaps + 1,
  };
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
    return {
      ...state,
      last: p,
      startedAt: state.startedAt ?? p.t,
      track: foldTrack(state.track, p),
      altRef: Number.isFinite(p.alt) ? p.alt : null,
    };
  }

  const dt = (p.t - prev.t) / 1000;
  if (dt <= 0) return state; // out-of-order or duplicate fix

  // A hole in the data. Backgrounded app, dead signal, phone asleep: whatever
  // happened in between is unknown, and a straight line across it is a
  // fabrication that looks entirely plausible in the total.
  if (dt > MAX_GAP_S) return reanchor(state, p);

  const dist = haversine(prev, p);
  const speed = dist / dt;

  // A jump: teleported across town between two fixes. Keep it as the new
  // anchor — the phone is there now — but do not count the distance, or one
  // tunnel exit adds a kilometre you never rode.
  if (speed > MAX_PLAUSIBLE_MS) return reanchor(state, p);

  const moving = speed >= MOVING_THRESHOLD_MS;
  const window = [...state.speedWindow, speed].slice(-SPEED_WINDOW);
  const smoothed = window.reduce((a, b) => a + b, 0) / window.length;
  const { ascent, altRef } = foldAscent(state, p);

  return {
    ...state,
    last: p,
    track: foldTrack(state.track, p),
    // Standing still still produces small drifting deltas; not counting them
    // is what keeps a ride's distance honest while you wait at a crossing.
    distance: state.distance + (moving ? dist : 0),
    movingTime: state.movingTime + (moving ? dt : 0),
    elapsed: (p.t - (state.startedAt ?? p.t)) / 1000,
    // A window that is not yet full is still an average of real fixes, but a
    // single one of them is exactly the spike the window exists to reject.
    topSpeed: window.length >= SPEED_WINDOW ? Math.max(state.topSpeed, smoothed) : state.topSpeed,
    speedWindow: window,
    ascent,
    altRef,
  };
}

export function emptyRide() {
  return {
    startedAt: null,
    last: null,
    track: [],      // [[lat, lon], ...] thinned route for drawing
    distance: 0,    // metres
    movingTime: 0,  // seconds actually moving
    elapsed: 0,     // seconds since the first fix
    topSpeed: 0,    // m/s, smoothed
    ascent: 0,      // metres climbed
    speedWindow: [],
    altRef: null,   // last believed altitude, metres
    gaps: 0,        // holes in the data, for honesty about the record
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
 * A battery percentage as typed.
 *
 * An empty field is not zero. `Number("")` is 0, and 0 read as "ended at 0%"
 * turns a blank box into a full-pack discharge and a range figure invented out
 * of nothing — so blank has to come back as NaN and be rejected downstream.
 */
export function parsePercent(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v !== "string") return NaN;
  const s = v.trim();
  if (s === "") return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const inPercentRange = (n) => Number.isFinite(n) && n >= 0 && n <= 100;

/**
 * Energy used, from the two battery readings the rider types in.
 *
 * Percentages alone say nothing comparable — 20% of a 250Wh pack is not 20% of
 * a 600Wh one — so the pack size turns them into watt-hours, and watt-hours
 * over distance is the number that lets two different scooters be compared at
 * all. This is the figure the whole app exists for.
 */
export function energyStats({ batteryStart, batteryEnd, packWh, distanceM }) {
  const start = parsePercent(batteryStart);
  const end = parsePercent(batteryEnd);

  if (!inPercentRange(start) || !inPercentRange(end)) return null;
  if (!Number.isFinite(packWh) || packWh <= 0) return null;
  if (!Number.isFinite(distanceM) || distanceM <= 0) return null;

  const usedPct = start - end;
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
    estimatedRangeKm: packWh / whPerKm,
    // A gauge reading to the whole percent is worth ±0.5%, and on a short hop
    // that dwarfs the measurement. Carried so the app can say how much to
    // trust the number instead of printing all of them alike.
    whPerKmTolerance: (packWh * 0.005) / km,
  };
}

/** A ride whose energy figure is precise enough to reason about pack health.
 *  One percent of a pack over 300 metres is not a measurement. */
export function isEnergySample(ride, { minUsedPct = 5, minDistanceM = 1000 } = {}) {
  return !!(
    ride &&
    ride.energy &&
    Number.isFinite(ride.energy.estimatedRangeKm) &&
    ride.energy.usedPct >= minUsedPct &&
    (ride.distance || 0) >= minDistanceM
  );
}

function median(xs) {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/**
 * How the pack is ageing.
 *
 * The promise on the tin: not the range printed on the box, and not one lucky
 * ride either, but the measured range now against the measured range when the
 * record started. Medians rather than means, because a single winter ride into
 * a headwind should not be able to declare your battery dead.
 *
 * `rides` newest first, as stored.
 */
export function packHealth(rides, { window = 3 } = {}) {
  const samples = (rides || []).filter((r) => isEnergySample(r));
  if (samples.length < 2) return null;

  const newest = samples.slice(0, window);
  const oldest = samples.slice(-window);

  const current = {
    rangeKm: median(newest.map((r) => r.energy.estimatedRangeKm)),
    whPerKm: median(newest.map((r) => r.energy.whPerKm)),
  };
  const baseline = {
    rangeKm: median(oldest.map((r) => r.energy.estimatedRangeKm)),
    whPerKm: median(oldest.map((r) => r.energy.whPerKm)),
  };

  // Two windows drawn from the same handful of rides would be comparing a
  // number with itself and calling the difference wear.
  const comparable = samples.length >= window * 2;

  return {
    samples: samples.length,
    current,
    baseline,
    fadePct: comparable ? ((baseline.rangeKm - current.rangeKm) / baseline.rangeKm) * 100 : null,
    // Oldest first: a trend reads left to right.
    trend: [...samples]
      .reverse()
      .map((r) => ({
        t: r.startedAt,
        rangeKm: r.energy.estimatedRangeKm,
        whPerKm: r.energy.whPerKm,
      })),
  };
}

/** Lifetime totals, computed rather than stored — one source of truth. */
export function totals(rides) {
  return (rides || []).reduce(
    (a, r) => ({
      rides: a.rides + 1,
      distance: a.distance + (r.distance || 0),
      movingTime: a.movingTime + (r.movingTime || 0),
      wh: a.wh + (r.energy?.wh || 0),
      ascent: a.ascent + (r.ascent || 0),
    }),
    { rides: 0, distance: 0, movingTime: 0, wh: 0, ascent: 0 },
  );
}

const DAY_MS = 86400000;
const dayNumber = (ms) => {
  // Built from the LOCAL calendar date: a ride at 01:00 belongs to the day you
  // rode it, not to the previous one because UTC says so.
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
};

/**
 * Consecutive days ridden, ending today or yesterday.
 *
 * Yesterday still counts because a streak the app declares dead at midnight,
 * before the day it is judging is over, is a streak that punishes you for
 * looking at the screen in the morning.
 */
export function streakDays(rides, now = Date.now()) {
  const days = new Set(
    (rides || [])
      .map((r) => r.startedAt)
      .filter((t) => Number.isFinite(t))
      .map(dayNumber),
  );
  if (!days.size) return 0;

  const today = dayNumber(now);
  let cursor = days.has(today) ? today : days.has(today - 1) ? today - 1 : null;
  if (cursor == null) return 0;

  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor--;
  }
  return n;
}
