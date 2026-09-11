/**
 * Tests for the ride maths. Plain Node, no test runner:
 *
 *   node src/ride.test.mjs
 *
 * Deliberately dependency-free so it runs before any toolchain exists and
 * keeps running when the app's does not.
 */
import {
  addPoint, emptyRide, avgSpeed, haversine, energyStats,
  msToKmh, fmtDuration, fmtDistance, isUsable,
} from "./ride.js";

let failures = 0;
function check(name, got, want, tolerance = 0) {
  const ok =
    typeof want === "number"
      ? Math.abs(got - want) <= tolerance
      : JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  got ${got}, want ${want}`}`);
  if (!ok) failures++;
}

/** A straight line east from a start point, one fix per second. */
function ride(speedsMs, { accuracy = 5, startLat = 44.43, startLon = 26.10 } = {}) {
  let s = emptyRide();
  let lat = startLat, lon = startLon, t = 1_700_000_000_000;
  s = addPoint(s, { lat, lon, t, accuracy, alt: 80 });
  for (const v of speedsMs) {
    t += 1000;
    // metres -> degrees of longitude at this latitude
    lon += (v / (111_320 * Math.cos((lat * Math.PI) / 180)));
    s = addPoint(s, { lat, lon, t, accuracy, alt: 80 });
  }
  return s;
}

console.log("haversine");
check("1 degree of latitude ≈ 111km", haversine({lat:0,lon:0},{lat:1,lon:0}), 111195, 50);
check("same point is zero", haversine({lat:44,lon:26},{lat:44,lon:26}), 0);

console.log("\nfix quality");
check("bad accuracy rejected", isUsable({lat:1,lon:1,t:1,accuracy:80}), false);
check("good accuracy kept", isUsable({lat:1,lon:1,t:1,accuracy:8}), true);
check("missing accuracy tolerated", isUsable({lat:1,lon:1,t:1}), true);

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

console.log("\nenergy — the reason the app exists");
{
  const e = energyStats({ batteryStart: 100, batteryEnd: 50, packWh: 500, distanceM: 25000 });
  check("watt-hours used", e.wh, 250, 0.01);
  check("Wh per km", e.whPerKm, 10, 0.01);
  check("measured full range", e.estimatedRangeKm, 50, 0.01);
  check("charged mid-ride rejected", energyStats({batteryStart:40,batteryEnd:90,packWh:500,distanceM:1000}), null);
  check("no pack size, no answer", energyStats({batteryStart:100,batteryEnd:50,distanceM:1000}), null);
}

console.log("\nformatting");
check("minutes", fmtDuration(125), "2:05");
check("hours", fmtDuration(3725), "1:02:05");
check("metres", fmtDistance(840), "840 m");
check("kilometres", fmtDistance(12345), "12.35 km");

console.log(failures ? `\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
