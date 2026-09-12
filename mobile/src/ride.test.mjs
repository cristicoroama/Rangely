/**
 * Tests for the ride maths. Plain Node, no test runner:
 *
 *   node src/ride.test.mjs
 *
 * Deliberately dependency-free so it runs before any toolchain exists and
 * keeps running when the app's does not.
 */
import {
  addPoint, emptyRide, avgSpeed, haversine, energyStats, parsePercent,
  msToKmh, fmtDuration, fmtDistance, isUsable, packHealth, totals, streakDays,
  MAX_GAP_S, TRACK_SPACING_M,
} from "./ride.js";

let failures = 0;
const show = (v) => (typeof v === "object" ? JSON.stringify(v) : String(v));

function check(name, got, want, tolerance = 0) {
  const ok =
    typeof want === "number"
      ? Math.abs(got - want) <= tolerance
      : JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  got ${show(got)}, want ${show(want)}`}`);
  if (!ok) failures++;
}

const START_T = 1_700_000_000_000;

/** A straight line east from a start point, one fix per second.
 *  `alts` supplies an altitude per fix when a test cares about climbing. */
function ride(speedsMs, opts = {}) {
  const { accuracy = 5, startLat = 44.43, startLon = 26.10, alts = null, altAccuracy } = opts;
  const altAt = (i) => (alts ? alts[Math.min(i, alts.length - 1)] : 80);

  let s = emptyRide();
  let lat = startLat, lon = startLon, t = START_T;
  s = addPoint(s, { lat, lon, t, accuracy, alt: altAt(0), altAccuracy });
  speedsMs.forEach((v, i) => {
    t += 1000;
    // metres -> degrees of longitude at this latitude
    lon += v / (111_320 * Math.cos((lat * Math.PI) / 180));
    s = addPoint(s, { lat, lon, t, accuracy, alt: altAt(i + 1), altAccuracy });
  });
  return s;
}

console.log("haversine");
check("1 degree of latitude ≈ 111km", haversine({lat:0,lon:0},{lat:1,lon:0}), 111195, 50);
check("same point is zero", haversine({lat:44,lon:26},{lat:44,lon:26}), 0);

console.log("\nfix quality");
check("bad accuracy rejected", isUsable({lat:1,lon:1,t:1,accuracy:80}), false);
check("good accuracy kept", isUsable({lat:1,lon:1,t:1,accuracy:8}), true);
check("missing accuracy tolerated", isUsable({lat:1,lon:1,t:1}), true);
check("impossible latitude rejected", isUsable({lat:132,lon:1,t:1}), false);
check("NaN coordinates rejected", isUsable({lat:NaN,lon:1,t:1}), false);

console.log("\ndistance and time");
{
  // 10 seconds at 5 m/s = 50 m
  const s = ride(Array(10).fill(5));
  check("distance", s.distance, 50, 1);
  check("moving time", s.movingTime, 10, 0.01);
  check("avg speed", avgSpeed(s), 5, 0.1);
}

console.log("\nstopped at a light (trap 2)");
{
  // 10s riding, 20s stopped (drifting 0.2 m/s), 10s riding
  const s = ride([...Array(10).fill(5), ...Array(20).fill(0.2), ...Array(10).fill(5)]);
  check("drift not counted as distance", s.distance, 100, 3);
  check("stopped time excluded", s.movingTime, 20, 0.5);
  check("elapsed still counts it", s.elapsed, 40, 0.5);
  // The point of the whole exercise: average must stay 5, not drop to 2.5.
  check("avg speed unaffected by the light", avgSpeed(s), 5, 0.2);
}

console.log("\nGPS jump (trap 1)");
{
  let s = ride(Array(5).fill(5));
  const before = s.distance;
  // One fix a kilometre away, one second later — impossible.
  s = addPoint(s, { lat: 44.44, lon: 26.12, t: s.last.t + 1000, accuracy: 5, alt: 80 });
  check("jump adds no distance", s.distance, before, 0.01);
  check("but becomes the new anchor", s.last.lon, 26.12, 0.001);
  check("and is recorded as a gap", s.gaps, 1);
}

console.log("\ntop speed (trap 3)");
{
  // Steady 5 m/s with a single 24 m/s spike that survives the plausibility
  // gate but must not survive smoothing.
  const s = ride([...Array(8).fill(5), 24, ...Array(8).fill(5)]);
  const kmh = msToKmh(s.topSpeed);
  check("spike smoothed away", kmh < 50, true);
  check("real speed still reported", kmh > 17, true);
}
{
  // Two fixes are not a window. A ride that is one sprint long must not
  // report the sprint as a smoothed average of itself.
  const s = ride([24]);
  check("half a window reports nothing", s.topSpeed, 0, 0.001);
}

console.log("\ngaps in the data (trap 4)");
{
  let s = ride(Array(10).fill(5));
  const before = s.distance;
  // Five minutes later, a kilometre away: 3.3 m/s, entirely plausible as a
  // speed, and entirely made up as a segment. This is what an app backgrounded
  // at a café looks like.
  s = addPoint(s, { lat: 44.43, lon: 26.1125, t: s.last.t + 300_000, accuracy: 5, alt: 80 });
  check("hole adds no distance", s.distance, before, 0.01);
  check("hole adds no moving time", s.movingTime, 10, 0.01);
  check("counted as a gap", s.gaps, 1);
  check("elapsed spans the hole", s.elapsed, 310, 1);

  // And the boundary: just inside the limit is still a segment.
  let t2 = ride(Array(3).fill(5));
  const d2 = t2.distance;
  const step = (MAX_GAP_S - 1) * 4; // 4 m/s across the gap, plausible
  t2 = addPoint(t2, {
    lat: 44.43,
    lon: t2.last.lon + step / (111_320 * Math.cos((44.43 * Math.PI) / 180)),
    t: t2.last.t + (MAX_GAP_S - 1) * 1000,
    accuracy: 5,
    alt: 80,
  });
  check("a short pause is still a segment", t2.distance > d2 + step - 2, true);
}

console.log("\nascent (trap 5)");
{
  // A flat ride, with the altitude wandering ±2 m the way it really does.
  const noise = [80, 82, 78, 81, 79, 82, 78, 80, 81, 79, 80];
  const s = ride(Array(10).fill(5), { alts: noise });
  check("noise is not a mountain", s.ascent, 0, 0.001);
}
{
  // A genuine 50 m climb, one metre per second.
  const climb = Array.from({ length: 51 }, (_, i) => 80 + i);
  const s = ride(Array(50).fill(5), { alts: climb });
  check("a real climb is counted", s.ascent, 50, 3);
}
{
  // Up 30 and back down: only the up half counts, and the descent must not
  // re-arm the counter into counting the same hill twice.
  const alts = [
    ...Array.from({ length: 31 }, (_, i) => 80 + i),
    ...Array.from({ length: 30 }, (_, i) => 110 - i),
  ];
  const s = ride(Array(60).fill(5), { alts });
  check("a hill is counted once", s.ascent, 30, 3);
}
{
  const s = ride(Array(10).fill(5), { alts: [80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180], altAccuracy: 60 });
  check("vague altitude does not vote", s.ascent, 0, 0.001);
}

console.log("\ntrack");
{
  const s = ride(Array(20).fill(5)); // 100 m at 5 m/s, one fix a second
  check("route is thinned as it is recorded", s.track.length < 21, true);
  check("but keeps enough to draw", s.track.length >= 5, true);
  check("first point is the start", s.track[0][1], 26.10, 0.0001);

  // The invariant that matters: nothing kept sits on top of what came before.
  const spacings = s.track.slice(1).map((p, i) =>
    haversine({ lat: s.track[i][0], lon: s.track[i][1] }, { lat: p[0], lon: p[1] }));
  check("no two kept points closer than the spacing",
    spacings.every((d) => d >= TRACK_SPACING_M - 0.001), true);
  check("and none absurdly far apart", Math.max(...spacings) < TRACK_SPACING_M * 3, true);
}

console.log("\nbattery input");
check("blank is not zero", Number.isNaN(parsePercent("")), true);
check("whitespace is not zero", Number.isNaN(parsePercent("  ")), true);
check("a typed number parses", parsePercent("87"), 87);
check("a real number passes through", parsePercent(12.5), 12.5);
check("rubbish is NaN", Number.isNaN(parsePercent("abc")), true);

console.log("\nenergy — the reason the app exists");
{
  const e = energyStats({ batteryStart: 100, batteryEnd: 50, packWh: 500, distanceM: 25000 });
  check("watt-hours used", e.wh, 250, 0.01);
  check("Wh per km", e.whPerKm, 10, 0.01);
  check("measured full range", e.estimatedRangeKm, 50, 0.01);
  check("charged mid-ride rejected", energyStats({batteryStart:40,batteryEnd:90,packWh:500,distanceM:1000}), null);
  check("no pack size, no answer", energyStats({batteryStart:100,batteryEnd:50,distanceM:1000}), null);

  // The one that used to invent a full discharge out of an empty text box:
  // Number("") is 0, and 0 read as "ended at 0%" turns a skipped field into a
  // range figure with nothing behind it.
  check("empty end field is not a flat battery",
    energyStats({batteryStart:"100", batteryEnd:"", packWh:500, distanceM:10000}), null);
  check("empty start field too",
    energyStats({batteryStart:"", batteryEnd:"40", packWh:500, distanceM:10000}), null);
  check("a gauge cannot read 150%",
    energyStats({batteryStart:150, batteryEnd:40, packWh:500, distanceM:10000}), null);
  check("ridden to empty is legitimate",
    energyStats({batteryStart:"100", batteryEnd:"0", packWh:500, distanceM:50000}).wh, 500, 0.01);

  // One percent of the pack is worth ±0.5%, and on a short hop that is most of
  // the measurement.
  const short = energyStats({ batteryStart: 100, batteryEnd: 99, packWh: 500, distanceM: 500 });
  check("short hops carry a wide tolerance", short.whPerKmTolerance > short.whPerKm * 0.4, true);
  check("long rides do not", e.whPerKmTolerance < e.whPerKm * 0.02, true);
}

console.log("\npack health");
{
  const mk = (daysAgo, rangeKm, { usedPct = 50, distance = 20000 } = {}) => ({
    id: String(daysAgo),
    startedAt: START_T - daysAgo * 86400000,
    distance,
    movingTime: 3600,
    energy: { usedPct, wh: 250, whPerKm: 500 / rangeKm, estimatedRangeKm: rangeKm },
  });

  check("nothing to say about one ride", packHealth([mk(1, 50)]), null);

  // Newest first, as stored: three recent rides at 48 km, three old ones at 60.
  const h = packHealth([mk(1,48), mk(2,48), mk(3,48), mk(40,60), mk(41,60), mk(42,60)]);
  check("range now", h.current.rangeKm, 48, 0.01);
  check("range when the record started", h.baseline.rangeKm, 60, 0.01);
  check("fade", h.fadePct, 20, 0.01);
  check("trend runs oldest to newest", h.trend[0].rangeKm, 60, 0.01);
  check("trend ends at the latest ride", h.trend[h.trend.length - 1].rangeKm, 48, 0.01);

  // Too few rides to compare a "now" against a "then" without the two windows
  // being made of the same rides.
  const few = packHealth([mk(1,48), mk(2,52), mk(3,50)]);
  check("no fade claimed from overlapping windows", few.fadePct, null);
  check("but a current figure is still given", few.current.rangeKm > 0, true);

  // One percent over 400 metres is not a measurement, and must not be allowed
  // to declare a battery dead.
  const noisy = packHealth([
    mk(1, 5, { usedPct: 1, distance: 400 }), mk(2, 48), mk(3, 48), mk(4, 48),
    mk(40, 60), mk(41, 60), mk(42, 60),
  ]);
  check("imprecise rides are not samples", noisy.samples, 6);
  check("and do not move the figure", noisy.current.rangeKm, 48, 0.01);
}

console.log("\nlifetime totals");
{
  const t = totals([
    { distance: 10000, movingTime: 1800, ascent: 40, energy: { wh: 100 } },
    { distance: 5000, movingTime: 900, ascent: 10 },
  ]);
  check("distance", t.distance, 15000);
  check("moving time", t.movingTime, 2700);
  check("energy adds only what was measured", t.wh, 100);
  check("ascent", t.ascent, 50);
  check("empty history", totals([]).rides, 0);
}

console.log("\nstreak");
{
  const now = new Date(2026, 0, 15, 20, 0, 0).getTime();
  const at = (d, h = 12) => new Date(2026, 0, 15 - d, h, 0, 0).getTime();

  check("no rides, no streak", streakDays([], now), 0);
  check("today alone is a streak of one", streakDays([{ startedAt: at(0) }], now), 1);
  check("three days running", streakDays([{startedAt:at(0)},{startedAt:at(1)},{startedAt:at(2)}], now), 3);
  check("two rides in one day do not double it",
    streakDays([{startedAt:at(0,7)},{startedAt:at(0,19)},{startedAt:at(1)}], now), 2);
  check("a missed day ends it",
    streakDays([{startedAt:at(0)},{startedAt:at(2)},{startedAt:at(3)}], now), 1);
  // Judged before the day is over, a streak that dies at midnight punishes you
  // for looking at the screen in the morning.
  check("yesterday still counts", streakDays([{startedAt:at(1)},{startedAt:at(2)}], now), 2);
  check("last week does not", streakDays([{startedAt:at(6)}], now), 0);
  check("a ride at 01:00 belongs to that day",
    streakDays([{startedAt:at(0,1)},{startedAt:at(1,23)}], now), 2);
}

console.log("\nformatting");
check("minutes", fmtDuration(125), "2:05");
check("hours", fmtDuration(3725), "1:02:05");
check("metres", fmtDistance(840), "840 m");
check("kilometres", fmtDistance(12345), "12.35 km");

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
