import { AppState } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

/**
 * Background location, for builds that can have it.
 *
 * Expo Go cannot run a background location task — the client app has no
 * background location entitlement, and never will. So this module is written
 * to FAIL, loudly but harmlessly, on the exact call that is not allowed:
 * `useRideTracker` tries it first and drops back to the foreground watcher
 * when it refuses. The same JavaScript therefore records a ride in Expo Go
 * with the screen on, and records it with the screen off in a real build, with
 * no flag to set and nothing to remember.
 *
 * The task is defined at module scope on purpose. Expo dispatches events to
 * tasks before any component mounts — after the OS has restarted the app to
 * hand it a batch of locations, there is no component yet.
 *
 * ANDROID 12 AND LATER: an app may not start a foreground service while it is
 * in the background, and a permission dialog puts it there. Asking for "allow
 * all the time" and then immediately starting the service throws
 * ForegroundServiceStartNotAllowedException — which is a native crash, not a
 * rejected promise, so it takes the whole app down. That is why permission is
 * only ever CHECKED here, never requested, and why the service waits for the
 * activity to be resumed before it starts. Asking is a separate, deliberate
 * act: `requestBackgroundPermission`, called from a button, on a screen the
 * user is looking at.
 */
export const RIDE_TASK = "rangely-ride-location";

/** Where fixes go while a ride is being recorded. Module-level rather than
 *  passed in, because the task is registered once for the life of the process
 *  and the hook comes and goes. */
let sink = null;

export function setSink(fn) {
  sink = fn;
}

TaskManager.defineTask(RIDE_TASK, ({ data, error }) => {
  // An error here is the OS declining to give us locations (permission
  // revoked mid-ride, location switched off). There is nothing to do with it
  // in a headless task, and throwing would take the app with it.
  if (error || !data || !Array.isArray(data.locations)) return;
  for (const loc of data.locations) {
    try {
      sink?.(loc);
    } catch {
      /* one bad fix must not stop the ones behind it */
    }
  }
});

/** Is "allow all the time" already granted? Asked, never demanded. */
export async function hasBackgroundPermission() {
  try {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === "granted";
  } catch {
    // Expo Go and any build without the entitlement land here.
    return false;
  }
}

/**
 * Ask for "allow all the time".
 *
 * Separate from starting a ride, because on Android this sends the user out to
 * a settings screen: the app is backgrounded, and anything that tried to start
 * a service on the way back would crash. Call it from a button, then let the
 * next ride pick the permission up.
 */
export async function requestBackgroundPermission() {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== "granted") return false;
    const bg = await Location.requestBackgroundPermissionsAsync();
    return bg.status === "granted";
  } catch {
    return false;
  }
}

/** Resolve once the activity is actually resumed — starting a foreground
 *  service a moment too early is a crash, not an error. */
function whenActive(timeoutMs = 4000) {
  if (AppState.currentState === "active") return Promise.resolve(true);

  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        sub.remove();
      } catch {
        /* already gone */
      }
      resolve(ok);
    };
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") finish(true);
    });
    // Never hang a ride on a state change that is not coming.
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

/** True once the OS is delivering fixes to the task. Never throws: callers
 *  treat false as "use the foreground watcher instead". */
export async function startBackground() {
  try {
    if (!(await hasBackgroundPermission())) return false;

    // See the note at the top of the file. This is the line that keeps the
    // app alive on Android 12 and later.
    if (!(await whenActive())) return false;

    // A task left running by a crash would otherwise deliver fixes into a new
    // ride from the moment it starts.
    if (await Location.hasStartedLocationUpdatesAsync(RIDE_TASK)) {
      await Location.stopLocationUpdatesAsync(RIDE_TASK);
    }

    await Location.startLocationUpdatesAsync(RIDE_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      // Let ride.js decide what counts as a stop. iOS pausing updates by
      // itself is how a tracker silently loses the second half of a ride.
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.OtherNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Rangely is recording",
        notificationBody: "Distance, speed and energy for this ride.",
        notificationColor: "#2fd27a",
        killServiceOnDestroy: false,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopBackground() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(RIDE_TASK)) {
      await Location.stopLocationUpdatesAsync(RIDE_TASK);
    }
  } catch {
    /* nothing was running */
  }
}

/** Was a ride left recording by a crash or a force-quit? */
export async function isBackgroundRunning() {
  try {
    return await Location.hasStartedLocationUpdatesAsync(RIDE_TASK);
  } catch {
    return false;
  }
}
