import { isEnergySample } from "./ride.js";
import { MODES } from "./modes.js";
import { tempAdjust } from "./weather.js";

/**
 * "Can I get there and back?" — the question every scooter rider asks before
 * turning off the main road, answered from their own rides.
 *
 * The inputs are the battery now, how many kilometres this rider actually
 * gets per 1% (in the mode they are about to ride in, when there is enough of
 * that), and today's temperature against the temperature those rides were
 * measured at. The output is deliberately conservative, because the two ways
 * to be wrong are not equal: arriving home with 15% left is fine, pushing a
 * 20 kg scooter the last three kilometres is not.
 *
 *   - RESERVE_PCT stays in the pack. Most scooters cut power or speed near
 *     empty, and the last few percent on the gauge are not the last few
 *     percent of distance.
 *   - MARGIN comes off what is left for wind, hills, and a detour.
 *   - Half of the rest is the way out; the other half is the way back.
 *
 * On the map it becomes a circle, and a circle is as the crow flies — roads
 * are not. ROAD_FACTOR is the usual ratio of road distance to straight-line
 * distance in a town, so the circle is drawn smaller than the number.
 *
 * Pure: no React, no GPS, no network.
 */
export const RESERVE_PCT = 10;
export const MARGIN = 0.9;
export const ROAD_FACTOR = 1.3;

/** Without a single measured ride: typical Wh per km by mode, for a rider of
 *  average weight on a flat town ride. Only ever shown labelled as a guess. */
const GUESS_WH_PER_KM = { eco: 11, normal: 14, sport: 18, turbo: 24 };

function pooled(list) {
  const km = list.reduce((a, r) => a + r.distance / 1000, 0);
  const pct = list.reduce((a, r) => a + r.energy.usedPct, 0);
  const temps = list.map((r) => r.weather?.tempC).filter(Number.isFinite);
  return {
    rides: list.length,
    pct,
    kmPerPct: pct > 0 ? km / pct : null,
    // What those rides were measured at, if they were — the anchor for the
    // cold adjustment.
    tempC: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
  };
}

/**
 * Where the km-per-1% figure comes from, best source first:
 *   "mode" — measured rides in the mode about to be ridden (needs ≥ 20% of
 *            battery's worth, or one windy ride decides it);
 *   "all"  — every measured ride, when the mode has too few;
 *   "guess"— the pack size and a typical consumption, before any ride.
 */
export function rangeBasis(rides, { mode = null, packWh = 500, dual = false, minPct = 20 } = {}) {
  const samples = (rides || []).filter(isEnergySample);
  if (mode) {
    const own = pooled(samples.filter((r) => r.mode === mode));
    if (own.pct >= minPct && own.kmPerPct) return { source: "mode", mode, ...own };
  }
  const all = pooled(samples);
  if (all.pct >= minPct && all.kmPerPct) return { source: "all", mode: null, ...all };

  const whPerKm = (GUESS_WH_PER_KM[mode] ?? GUESS_WH_PER_KM.normal) * (dual ? 1.3 : 1);
  const wh = Number(packWh) > 0 ? Number(packWh) : 500;
  return { source: "guess", mode, rides: 0, pct: 0, kmPerPct: wh / 100 / whPerKm, tempC: null };
}

/**
 * How far out, from `batteryPct` now. Null while the battery is unknown.
 *
 *   eachWayKm   — ride out this far and you can still ride back
 *   roundTripKm — the whole loop, out and back
 *   oneWayKm    — how far it goes if you are not coming back
 *   radiusM / oneWayRadiusM — the same as straight-line circles for the map
 */
export function thereAndBack(batteryPct, basis, { tempNow = null } = {}) {
  const b = Number(batteryPct);
  if (!Number.isFinite(b) || b < 0 || b > 100 || !basis?.kmPerPct) return null;
  const temp = tempAdjust(tempNow, basis.tempC);
  const usable = Math.max(0, b - RESERVE_PCT);
  const total = usable * basis.kmPerPct * temp * MARGIN;
  return {
    batteryPct: b,
    usablePct: usable,
    roundTripKm: total,
    eachWayKm: total / 2,
    oneWayKm: total,
    radiusM: ((total / 2) * 1000) / ROAD_FACTOR,
    oneWayRadiusM: (total * 1000) / ROAD_FACTOR,
    tempFactor: temp,
    basis,
    lowBattery: b <= RESERVE_PCT + 5,
  };
}

/** A short line saying where the figure comes from, for under the number. */
export function basisLine(r, modeName) {
  if (!r) return "";
  const b = r.basis;
  const per = `${b.kmPerPct.toFixed(2)} km per 1%`;
  const from =
    b.source === "mode"
      ? `your ${modeName || MODES[b.mode]?.name || ""} rides`.replace("  ", " ")
      : b.source === "all"
        ? "all your measured rides"
        : "a typical scooter this size";
  const cold = r.tempFactor < 0.97 ? ` · cold: −${Math.round((1 - r.tempFactor) * 100)}%` : r.tempFactor > 1.03 ? ` · warm: +${Math.round((r.tempFactor - 1) * 100)}%` : "";
  return `${per} from ${from}${cold} · keeps ${RESERVE_PCT}% spare`;
}
