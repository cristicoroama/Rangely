import AsyncStorage from "@react-native-async-storage/async-storage";

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

export async function loadRides() {
  try {
    const raw = await AsyncStorage.getItem(RIDES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
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
    return raw ? JSON.parse(raw) : { name: "My scooter", packWh: 500 };
  } catch {
    return { name: "My scooter", packWh: 500 };
  }
}

export async function saveScooter(s) {
  await AsyncStorage.setItem(SCOOTER_KEY, JSON.stringify(s));
  return s;
}

/** Lifetime totals, computed rather than stored — one source of truth. */
export function totals(rides) {
  return rides.reduce(
    (a, r) => ({
      rides: a.rides + 1,
      distance: a.distance + (r.distance || 0),
      movingTime: a.movingTime + (r.movingTime || 0),
      wh: a.wh + (r.energy?.wh || 0),
    }),
    { rides: 0, distance: 0, movingTime: 0, wh: 0 },
  );
}
