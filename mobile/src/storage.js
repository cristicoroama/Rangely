import AsyncStorage from "@react-native-async-storage/async-storage";

import { totals } from "./ride";

/**
 * Local persistence. Everything lives on the phone for now — there is no
 * account and no server yet, and a tracker that needs a login before it will
 * record your first ride is a tracker nobody tries.
 *
 * Rides are stored newest-first under one key. That is fine for hundreds; when
 * it stops being fine, the fix is a real database, not a cleverer key scheme.
 */
const RIDES_KEY = "rangely.rides.v1";
const SCOOTER_KEY = "rangely.scooter.v1";
const PROFILE_KEY = "rangely.profile.v1";

/**
 * `model` is a preset key from scooters.js (or "other"), `display` is how the
 * scooter shows its charge — "app", "number" or "bars" — which decides both
 * how the battery is asked for and how much a reading can be trusted.
 */
export const DEFAULT_SCOOTER = { name: "My scooter", model: null, packWh: 500, display: "app" };

/**
 * Who is riding, at the level the app needs and no further: an age bracket
 * (which rules apply), a weekly goal, and whether the three opening screens
 * have been seen. No name, no birth date, no account.
 */
export const DEFAULT_PROFILE = { onboarded: false, ageBracket: null, goalKm: 25 };

export async function loadRides() {
  try {
    const raw = await AsyncStorage.getItem(RIDES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    // Rides written before the track was thinned as it was recorded still
    // carry `points`. Reading both costs one line and means a history from an
    // earlier build is not silently half-missing.
    return list.map((r) => (r && !r.track && Array.isArray(r.points) ? { ...r, track: r.points } : r));
  } catch {
    // A corrupt blob must not brick the app on launch; an empty history is
    // recoverable, a crash loop is not.
    return [];
  }
}

export async function saveRide(ride) {
  const rides = await loadRides();
  const next = [ride, ...rides];
  await AsyncStorage.setItem(RIDES_KEY, JSON.stringify(next));
  return next;
}

/** Overwrite the whole history in one write. Used by the delete path and by
 *  the development seed; a loop of saveRide() would re-read and re-write the
 *  list once per ride. */
export async function replaceRides(list) {
  const next = Array.isArray(list) ? list : [];
  await AsyncStorage.setItem(RIDES_KEY, JSON.stringify(next));
  return next;
}

export async function deleteRide(id) {
  const rides = await loadRides();
  const next = rides.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RIDES_KEY, JSON.stringify(next));
  return next;
}

export async function loadScooter() {
  try {
    const raw = await AsyncStorage.getItem(SCOOTER_KEY);
    // packWh is what turns a battery percentage into a comparable number, so
    // a sensible default beats an empty field the user skips past.
    return raw ? { ...DEFAULT_SCOOTER, ...JSON.parse(raw) } : { ...DEFAULT_SCOOTER };
  } catch {
    return { ...DEFAULT_SCOOTER };
  }
}

export async function saveScooter(s) {
  await AsyncStorage.setItem(SCOOTER_KEY, JSON.stringify(s));
  return s;
}

export async function loadProfile() {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(p) {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  return p;
}

// Totals are ride maths, and they live with the rest of it so they can be
// tested without a phone. Re-exported here because this is where callers
// already look for them.
export { totals };
