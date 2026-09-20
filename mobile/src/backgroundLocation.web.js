/**
 * The web build's version of background location: there isn't one.
 *
 * Metro picks this file over `backgroundLocation.js` on web, which keeps
 * `expo-task-manager` — a module with no web implementation — out of the
 * bundle entirely rather than importing it and hoping it fails politely.
 * `useRideTracker` already treats a refusal as "use the foreground watcher",
 * so saying no here is all this has to do.
 */
export const RIDE_TASK = "rangely-ride-location";

export function setSink() {}

export async function startBackground() {
  return false;
}

export async function stopBackground() {}

export async function isBackgroundRunning() {
  return false;
}
