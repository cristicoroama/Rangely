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
  msToKmh, fmtDuration, fmtDistance, isUsable, packHealth, totals,
  isEnergySample, pauseRide, currentSpeed,
  MAX_GAP_S, TRACK_SPACING_M,
} from "./ride.js";
import { weekStart, weeklyProgress, recentWeeks } from "./goals.js";
import { daylight, isAfterDark, needsHelmetByLaw, LOCAL } from "./rules.js";
import { BRANDS, DISPLAYS, SCOOTERS, findDisplay, findScooter, displayResolution, overLegalSpeed, scootersOf } from "./scooters.js";
import { buildDemoRides } from "./demoRides.js";
import { LEVELS, riderLevel, goalStreak, badges, newlyEarned } from "./achievements.js";
import { MODES, modesFor, modeLabel, defaultMode, modeStats, modeInsight, healthFor } from "./modes.js";
import { TILE, fitView, latToY, lonToX, projectTrack, tilesFor, trackBounds } from "./slippy.js";

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
  check("km per 1% of battery", e.kmPerPct, 0.5, 0.0001);
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
  // A ride that used `usedPct` of a pack and covered `km` — the range it
  // implies is 100 × km ÷ usedPct, so each ride here states its own range.
  const mk = (daysAgo, rangeKm, { usedPct = 50, resolution = 1 } = {}) => {
    const km = (rangeKm * usedPct) / 100;
    return {
      id: String(daysAgo),
      startedAt: START_T - daysAgo * 86400000,
      distance: km * 1000,
      movingTime: 3600,
      energy: {
        usedPct, resolution, wh: 250, whPerKm: 500 / rangeKm,
        estimatedRangeKm: rangeKm, kmPerPct: km / usedPct,
      },
    };
  };

  check("no rides, nothing to say", packHealth([]), null);

  // Seven recent rides at 48 km and seven old ones at 60, 50% each: two
  // windows of 350 battery points that share no ride.
  const recent = [1, 2, 3, 4, 5, 6, 7].map((d) => mk(d, 48));
  const old = [40, 41, 42, 43, 44, 45, 46].map((d) => mk(d, 60));
  const h = packHealth([...recent, ...old]);
  check("range now", h.current.rangeKm, 48, 0.01);
  check("range when the record started", h.baseline.rangeKm, 60, 0.01);
  check("health is now against then", h.healthPct, 80, 0.01);
  check("rounded to 5%", h.healthRounded, 80);
  check("and banded", h.band, "normal");
  check("trend runs oldest to newest", h.trend[0].rangeKm, 60, 0.01);

  // Not enough riding for two separate windows: a current range, no verdict.
  const few = packHealth([mk(1, 48), mk(2, 52), mk(3, 50)]);
  check("a current range from a few rides", few.current.rangeKm > 0, true);
  check("but no health claimed yet", few.healthPct, null);
  check("and it says how much more riding it needs", few.needPct, 450);

  // Pooling weights rides by the battery they used: a 60% ride at 40 km and a
  // 12% ride at 80 km are 52.2 km pooled, not the 60 km a plain average says.
  const pooled = packHealth([mk(1, 40, { usedPct: 60 }), mk(2, 80, { usedPct: 12 })]);
  check("rides are pooled by battery used", pooled.current.rangeKm, (100 * (24 + 9.6)) / 72, 0.01);

  // One percent over 400 metres is not a measurement.
  check("tiny rides are not samples", isEnergySample(mk(1, 40, { usedPct: 1 })), false);
  check("9% is still under the line", isEnergySample(mk(1, 40, { usedPct: 9 })), false);
  check("10% over 2 km is", isEnergySample(mk(1, 40, { usedPct: 10 })), true);
  // Five bars: one bar either way is 20 points, so a ride needs 40.
  check("one bar is not a measurement", isEnergySample(mk(1, 40, { usedPct: 20, resolution: 20 })), false);
  check("two bars are", isEnergySample(mk(1, 40, { usedPct: 40, resolution: 20 })), true);

  const bands = [[95, "good"], [85, "normal"], [75, "worn"], [60, "check"]].map(([pct, want]) => {
    const now = [1, 2, 3, 4, 5, 6, 7].map((d) => mk(d, pct));
    const then = [40, 41, 42, 43, 44, 45, 46].map((d) => mk(d, 100));
    return packHealth([...now, ...then]).band === want;
  });
  check("every band is reachable", bands.every(Boolean), true);
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

console.log("\nweekly goal");
{
  // Wednesday 16 September 2026, early evening.
  const now = new Date(2026, 8, 16, 18, 0, 0).getTime();
  const on = (y, m, d, h = 12) => new Date(y, m, d, h, 0, 0).getTime();
  const ride = (t, km) => ({ startedAt: t, distance: km * 1000 });

  check("weeks start on Monday", weekStart(now), new Date(2026, 8, 14).getTime());
  check("Sunday belongs to the week before it",
    weekStart(on(2026, 8, 20, 23)), new Date(2026, 8, 14).getTime());

  const rides = [
    ride(on(2026, 8, 14, 8), 6),   // Monday
    ride(on(2026, 8, 16, 7), 8.5), // today
    ride(on(2026, 8, 13, 20), 30), // last Sunday — last week
  ];
  const w = weeklyProgress(rides, 25, now);
  check("counts only this week", w.km, 14.5, 0.001);
  check("rides this week", w.rides, 2);
  check("fraction of the goal", w.fraction, 0.58, 0.001);
  check("not met yet", w.met, false);
  check("Wednesday leaves five days, today included", w.daysLeft, 5);
  check("the ring never overflows", weeklyProgress([ride(on(2026, 8, 15), 60)], 25, now).fraction, 1);
  check("a missing goal falls back to the default", weeklyProgress(rides, 0, now).goalKm, 25);

  const weeks = recentWeeks(rides, 25, now, 3);
  check("recent weeks, oldest first", weeks.map((x) => Math.round(x.km)), [0, 30, 15]);
  check("a met week is marked", weeks[1].met, true);
}

console.log("\npause");
{
  let s = ride(Array(10).fill(5));
  const before = s.distance;
  s = pauseRide(s);
  // Two minutes later, 600 m away: the rider walked it. Not ridden, and not a
  // signal gap either.
  s = addPoint(s, { lat: 44.43, lon: s.last.lon + 600 / (111_320 * Math.cos((44.43 * Math.PI) / 180)), t: s.last.t + 120_000, accuracy: 5, alt: 80 });
  check("a pause adds no distance", s.distance, before, 0.01);
  check("and is not a signal gap", s.gaps, 0);
  check("riding resumes normally", s.needsAnchor, false);
  const t0 = s.last.t;
  s = addPoint(s, { lat: 44.43, lon: s.last.lon + 5 / (111_320 * Math.cos((44.43 * Math.PI) / 180)), t: t0 + 1000, accuracy: 5, alt: 80 });
  check("the next metre counts again", s.distance > before + 4, true);
}

console.log("\nlive speed");
{
  check("zero before any movement", currentSpeed(emptyRide()), 0);
  check("smoothed like top speed", msToKmh(currentSpeed(ride(Array(5).fill(7)))), 25.2, 0.05);
}

console.log("\nrules");
{
  check("minimum age in Romania", LOCAL.minAge, 14);
  check("helmet by law for 14–15", needsHelmetByLaw("14-15"), true);
  check("not by law at 16", needsHelmetByLaw("16-17"), false);
  // Checked against published Bucharest times; the process runs in UTC here,
  // so these are only meaningful when TZ is Europe/Bucharest (npm test sets
  // nothing — the check below skips itself otherwise).
  const inRomania = new Date(2026, 5, 21, 12).getTimezoneOffset() === -180;
  if (inRomania) {
    const d = daylight(new Date(2026, 5, 21).getTime());
    check("midsummer sunset near 21:02", d.sunset, 21.03, 0.25);
    check("dark at 21:30 in June", isAfterDark(new Date(2026, 5, 21, 21, 30).getTime()), true);
    check("light at 16:00 in December", isAfterDark(new Date(2026, 11, 21, 16, 0).getTime()), false);
    check("dark at 17:15 in December", isAfterDark(new Date(2026, 11, 21, 17, 15).getTime()), true);
  } else {
    console.log("  skip  sunset checks (run with TZ=Europe/Bucharest)");
  }
}

console.log("\nscooters");
{
  check("presets carry a pack size", SCOOTERS.every((s) => s.packWh > 200 && s.packWh < 6000), true);
  check("every preset has a known brand", SCOOTERS.every((s) => BRANDS.includes(s.brand)), true);
  check("every preset has a known display", SCOOTERS.every((s) => displayResolution(s.display) === findDisplay(s.display).resolution && DISPLAYS.some((d) => d.key === s.display)), true);
  check("keys are unique", new Set(SCOOTERS.map((s) => s.key)).size, SCOOTERS.length);
  check("found by key", findScooter("segway-g30").packWh, 551);
  check("unknown key", findScooter("nope"), null);
  check("G2 Max is its real 48 V × 20.8 Ah", findScooter("kukirin-g2-max").packWh, Math.round(48 * 20.8));
  check("KuKirin shows ten bars", scootersOf("KuKirin").every((s) => s.display === "bars10"), true);
  check("a Dualtron is over the legal limit", overLegalSpeed(findScooter("dualtron-mini")), true);
  check("a Xiaomi is not", overLegalSpeed(findScooter("xiaomi-4-pro-2")), false);
  check("five bars are coarse", displayResolution("bars"), 20);
  check("ten bars, half as coarse", displayResolution("bars10"), 10);
  check("the app is exact", displayResolution("app"), 1);
  check("a ten-bar ride needs 20% to count", isEnergySample({ distance: 5000, energy: energyStats({ batteryStart: 80, batteryEnd: 70, packWh: 749, distanceM: 5000, resolution: 10 }) }), false);
  check("…and counts at 20%", isEnergySample({ distance: 9000, energy: energyStats({ batteryStart: 80, batteryEnd: 60, packWh: 749, distanceM: 9000, resolution: 10 }) }), true);
}

console.log("\nmap projection");
{
  // The numbers every tile server on earth agrees on.
  check("west edge of the world", lonToX(-180, 0), 0, 1e-12);
  check("east edge", lonToX(180, 0), 1, 1e-12);
  check("greenwich at zoom 1", lonToX(0, 1), 1, 1e-12);
  check("the equator is halfway down", latToY(0, 5), 16, 1e-9);
  check("mercator stops at 85°", latToY(85.0511, 0), 0, 0.0001);

  check("a single point is not a route", trackBounds([[44, 26]]), null);
  check("nor is nothing", trackBounds([]), null);
  check("rubbish points are ignored", trackBounds([[44, 26], [NaN, 26], [45, 27]]).maxLat, 45);

  const square = [[44.43, 26.10], [44.44, 26.10], [44.44, 26.12], [44.43, 26.12], [44.43, 26.10]];
  const view = fitView(square, 300, 200, { padding: 10 });
  const xy = projectTrack(square, view).split(" ").map((p) => p.split(",").map(Number));
  check("every fix lands inside the box",
    xy.every(([x, y]) => x >= 0 && x <= 300 && y >= 0 && y <= 200), true);
  check("and inside the padding",
    xy.every(([x, y]) => x >= 9 && x <= 291 && y >= 9 && y <= 191), true);
  check("the route is drawn as large as it fits",
    Math.max(...xy.map((p) => p[0])) - Math.min(...xy.map((p) => p[0])) > 150, true);

  // A ride ten times longer has to be drawn from further away.
  const wide = [[44.0, 25.0], [45.0, 27.0]];
  check("a longer ride zooms out", fitView(wide, 300, 200).zoom < view.zoom, true);
  check("no view without a box", fitView(square, 0, 200), null);

  const tiles = tilesFor(view);
  check("the view is covered by tiles", tiles.length >= 1, true);
  check("tiles start at or before the left edge", tiles[0].left <= 0, true);
  check("tile spacing is one tile", tiles.length < 2 || tiles.some((t) => t.left === tiles[0].left + TILE || t.top === tiles[0].top + TILE), true);
  check("a runaway view cannot flood a tile server",
    tilesFor({ zoom: 12, originX: 0, originY: 0, width: 99999, height: 99999 }).length <= 30, true);
}

console.log("\ndemo history");
{
  // The development seed is data the screens are judged against, so it has to
  // be data the app could actually have produced.
  const now = new Date(2026, 0, 15, 18, 0, 0).getTime();
  const demo = buildDemoRides(500, now);
  check("every demo ride has energy", demo.every((r) => r.energy), true);
  check("stored newest first", demo[0].startedAt > demo[demo.length - 1].startedAt, true);
  check("all marked as demo", demo.every((r) => r.demo === true), true);
  const h = healthFor(demo);
  check("the seed shows a worn pack", h.healthRounded >= 70 && h.healthRounded <= 90, true);
  check("measured on its main mode", h.mode, "normal");
  check("with enough riding to say so", h.baseline !== null, true);
  check("it leaves this week something to show", weeklyProgress(demo, 25, now).km > 0, true);
  check("every demo ride has a route to draw", demo.every((r) => r.track.length > 20), true);
  check("and the routes are real places", demo.every((r) => trackBounds(r.track) !== null), true);
  check("pack size is respected", buildDemoRides(250, now)[0].energy.usedPct >
    buildDemoRides(1000, now)[0].energy.usedPct, true);
}

console.log("\nlevels and badges");
{
  const DAY = 86400000;
  const at = (y, m, d, h = 17) => new Date(y, m - 1, d, h, 0).getTime();
  const r = (km, t, extra = {}) => ({ id: String(t), startedAt: t, distance: km * 1000, movingTime: km * 180, ...extra });

  check("no rides: rookie", riderLevel([]).level.key, "rookie");
  check("no rides: 25 km to Cruiser", riderLevel([]).toNextKm, 25);
  const lv = riderLevel([r(30, at(2026, 9, 1)), r(10, at(2026, 9, 2))]);
  check("40 km: cruiser", lv.level.key, "cruiser");
  check("40 km: 20% of the way to Explorer", lv.fraction, (40 - 25) / 75, 1e-9);
  check("levels climb", LEVELS.every((l, i) => i === 0 || l.km > LEVELS[i - 1].km), true);
  check("top level has no next", riderLevel([r(3000, at(2026, 9, 1))]).next, null);

  // Weeks starting Mon 31 Aug, 7 Sep, 14 Sep 2026; "now" is Tue 22 Sep.
  const now = at(2026, 9, 22, 12);
  const weeks = [r(26, at(2026, 8, 31)), r(30, at(2026, 9, 8)), r(12, at(2026, 9, 14)), r(14, at(2026, 9, 16))];
  check("streak counts back from last week while this one is open", goalStreak(weeks, 25, now), 3);
  check("streak includes this week once it is met", goalStreak([...weeks, r(25, at(2026, 9, 22, 9))], 25, now), 4);
  check("a missed week ends the streak", goalStreak([r(26, at(2026, 8, 31)), r(30, at(2026, 9, 14))], 25, now), 1);
  check("no rides, no streak", goalStreak([], 25, now), 0);

  const none = badges([], { goalKm: 25 });
  check("every badge listed", none.length >= 10, true);
  check("nothing earned with no rides", none.some((b) => b.earned), false);
  const first = newlyEarned([], [r(6, at(2026, 9, 21, 9))], { goalKm: 25 }).map((b) => b.key);
  check("first 6 km ride unlocks first-ride and 5 km", first.sort(), ["first-ride", "five-k"]);
  const early = badges([r(2, at(2026, 9, 21, 7))], { goalKm: 25 }).find((b) => b.key === "early");
  check("a 7 am ride is an early bird", early.earned, true);
  const partial = badges([r(10, at(2026, 9, 21))], { goalKm: 25 }).find((b) => b.key === "twenty-k");
  check("half of a long haul", partial.progress, 0.5, 1e-9);
  const earnedFirst = badges([r(6, at(2026, 9, 21, 9))], { goalKm: 25 });
  check("earned badges sort first", earnedFirst[0].earned && earnedFirst[1].earned && !earnedFirst[2].earned, true);
  const measured = r(20, at(2026, 9, 20), { energy: energyStats({ batteryStart: 90, batteryEnd: 50, packWh: 468, distanceM: 20000 }) });
  check("a measured ride earns range finder", badges([measured], { goalKm: 25 }).find((b) => b.key === "range").earned, true);
  const demo = badges(buildDemoRides(468, now), { goalKm: 25 });
  check("demo history earns battery doctor", demo.find((b) => b.key === "health").earned, true);
}

console.log("\nriding modes");
{
  const kk = findScooter("kukirin-g2-max");
  check("KuKirin labels its gears", modesFor(kk).map((m) => m.label), ["1 · Eco", "2 · Sport", "3 · Race"]);
  check("KuKirin gear 3 is the sport kind", modesFor(kk)[2].mode, "sport");
  check("Xiaomi 4 Pro has no S+", modesFor(findScooter("xiaomi-4-pro-2")).some((m) => m.mode === "turbo"), false);
  check("Xiaomi 5 has S+", modeLabel(findScooter("xiaomi-5"), "turbo"), "S+");
  check("Segway starts in D", modeLabel(findScooter("segway-g30"), defaultMode(findScooter("segway-g30"))), "D");
  check("NIU has no middle mode, starts in E-Save", defaultMode(findScooter("niu-kqi3-pro")), "eco");
  check("an unknown scooter gets plain names", modesFor(null).map((m) => m.label), ["Eco", "Normal", "Sport", "Turbo"]);
  check("dual-motor models are marked", findScooter("dualtron-thunder-3").dual && !findScooter("dualtron-mini").dual, true);

  const at = (d) => new Date(2026, 8, d, 17).getTime();
  const ride = (km, used, mode, d) => ({
    startedAt: at(d), distance: km * 1000, mode,
    energy: energyStats({ batteryStart: 90, batteryEnd: 90 - used, packWh: 500, distanceM: km * 1000 }),
  });
  const rides = [ride(20, 40, "eco", 1), ride(10, 20, "eco", 2), ride(15, 45, "sport", 3), ride(1, 30, "sport", 4)];
  const st = modeStats(rides);
  check("stats per mode, in mode order", st.map((x) => x.mode), ["eco", "sport"]);
  check("pooled: 30 km on 60% of eco", st[0].kmPerPct, 0.5, 1e-9);
  check("a 1 km ride is not a sample", st[1].rides, 1);
  check("eco range on a full charge", st[0].rangeKm, 50, 1e-9);
  const ins = modeInsight(st);
  check("sport takes half as much again", Math.round(ins.extraPct), 50);
  check("one mode is no comparison", modeInsight(st.slice(0, 1)), null);
  check("unmoded rides are left out", modeStats([{ ...rides[0], mode: undefined }]).length, 0);
  check("MODES are four", Object.keys(MODES).length, 4);
}

console.log("\nformatting");
check("minutes", fmtDuration(125), "2:05");
check("hours", fmtDuration(3725), "1:02:05");
check("metres", fmtDistance(840), "840 m");
check("kilometres", fmtDistance(12345), "12.35 km");

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
