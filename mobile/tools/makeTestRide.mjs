/**
 * A synthetic ride, as a GPX file, plus what the app should say about it.
 *
 *   node tools/makeTestRide.mjs
 *
 * Android Studio's emulator can replay a GPX track as real GPS fixes
 * (Extended controls › Location › import the file, then Play). That turns
 * "does recording work" from a question you answer by going outside in the
 * cold into one you answer in ten minutes at a desk, with the same ride every
 * time.
 *
 * The point is the ground truth. This script builds the track from segments
 * whose distance, duration and climb are known by construction, then runs the
 * very same points through `ride.js` — so the numbers it prints are what the
 * app must show. A disagreement is a bug in the app, not an argument about
 * what the GPS meant.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  addPoint, emptyRide, avgSpeed, msToKmh, fmtDuration, fmtDistance,
} from "../src/ride.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const START_LAT = 44.4268;
const START_LON = 26.1025;
const M_PER_DEG_LAT = 111320;
const mPerDegLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

/**
 * Each leg is a constant speed for a number of seconds, optionally climbing.
 * Heading changes make the track look like streets rather than a ruler, and
 * give the map something worth drawing.
 */
const LEGS = [
  { name: "warm-up",        kmh: 12, seconds: 60,  heading: 90,  climb: 0 },
  { name: "flat cruise",    kmh: 22, seconds: 300, heading: 90,  climb: 0 },
  { name: "red light",      kmh: 0,  seconds: 90,  heading: 90,  climb: 0 },
  { name: "the hill",       kmh: 18, seconds: 240, heading: 0,   climb: 40 },
  { name: "descent",        kmh: 26, seconds: 180, heading: 180, climb: -40 },
  { name: "sprint",         kmh: 34, seconds: 20,  heading: 270, climb: 0 },
  { name: "cool-down",      kmh: 16, seconds: 120, heading: 270, climb: 0 },
  { name: "waiting to lock", kmh: 0, seconds: 45,  heading: 270, climb: 0 },
];

/** Standing still is not standing still: a parked phone wanders a couple of
 *  metres while it waits. Modelled as a slow circle rather than a jump per
 *  second, because that is how drift actually behaves — and because a wander
 *  fast enough to look like riding would be testing the threshold rather than
 *  the app. Radius 2.5 m over half a minute is about 0.5 m/s, comfortably
 *  below the 1 m/s that counts as moving. */
const DRIFT_RADIUS_M = 2.5;
const DRIFT_PERIOD_S = 30;

function buildTrack() {
  const points = [];
  let lat = START_LAT;
  let lon = START_LON;
  let alt = 82;
  let t = Date.UTC(2026, 8, 20, 9, 0, 0);
  let truthDistance = 0;
  let truthMoving = 0;
  let truthClimb = 0;

  points.push({ lat, lon, alt, t, accuracy: 6 });

  for (const leg of LEGS) {
    const ms = leg.kmh / 3.6;
    const rad = (leg.heading * Math.PI) / 180;
    const climbPerSecond = leg.climb / leg.seconds;
    const baseLat = lat;
    const baseLon = lon;

    for (let i = 0; i < leg.seconds; i++) {
      t += 1000;
      alt += climbPerSecond;

      if (ms === 0) {
        // Around a fixed point, not away from it: adding an offset every
        // second would be a random walk, and the phone would drift down the
        // street while its owner stood at the light.
        const a = (2 * Math.PI * i) / DRIFT_PERIOD_S;
        lat = baseLat + (Math.sin(a) * DRIFT_RADIUS_M) / M_PER_DEG_LAT;
        lon = baseLon + (Math.cos(a) * DRIFT_RADIUS_M) / mPerDegLon(baseLat);
      } else {
        const north = Math.cos(rad) * ms;
        const east = Math.sin(rad) * ms;
        lat += north / M_PER_DEG_LAT;
        lon += east / mPerDegLon(lat);
        truthDistance += ms;
        truthMoving += 1;
      }

      points.push({ lat, lon, alt, t, accuracy: 6 });
    }
    if (leg.climb > 0) truthClimb += leg.climb;
  }

  return { points, truthDistance, truthMoving, truthClimb };
}

function toGpx(points) {
  const trkpts = points
    .map(
      (p) =>
        `      <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">\n` +
        `        <ele>${p.alt.toFixed(1)}</ele>\n` +
        `        <time>${new Date(p.t).toISOString()}</time>\n` +
        `      </trkpt>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Rangely test ride" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Rangely synthetic ride</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`;
}

const { points, truthDistance, truthMoving, truthClimb } = buildTrack();

mkdirSync(HERE, { recursive: true });
const gpxPath = join(HERE, "test-ride.gpx");
writeFileSync(gpxPath, toGpx(points), "utf8");

// The same fixes, through the app's own maths.
let s = emptyRide();
for (const p of points) s = addPoint(s, p);

const pad = (label, value) => `  ${label.padEnd(22)} ${value}`;

console.log(`Wrote ${gpxPath}  (${points.length} fixes, ${LEGS.reduce((a, l) => a + l.seconds, 0) + 1}s)\n`);
console.log("Built to be:");
console.log(pad("distance", fmtDistance(truthDistance)));
console.log(pad("moving time", fmtDuration(truthMoving)));
console.log(pad("climb", `${truthClimb} m`));
console.log("\nWhat the app should show:");
console.log(pad("distance", fmtDistance(s.distance)));
console.log(pad("moving", fmtDuration(s.movingTime)));
console.log(pad("elapsed", fmtDuration(s.elapsed)));
console.log(pad("avg", `${msToKmh(avgSpeed(s)).toFixed(1)} km/h`));
console.log(pad("top", `${msToKmh(s.topSpeed).toFixed(1)} km/h`));
console.log(pad("climbed", `${Math.round(s.ascent)} m`));
console.log(pad("gaps", String(s.gaps)));
console.log(pad("track points kept", String(s.track.length)));
console.log(`
Load it in the emulator: Extended controls (…) › Location › Import GPX/KML,
then Play. Or on a real phone, any "mock location" app that reads GPX with
developer options set. The app's numbers should match the block above; the
first block is what the ride physically was, and the difference between the
two blocks is what the filters deliberately throw away.
`);
