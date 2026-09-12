import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

/**
 * Background location, for builds that can have it.
 *
 * Expo Go cannot run a background location task — the client app has no
 * background location entitlement, and never will. So this module is written
 * to FAIL, loudly but harmlessly, on the exact call that is not allowed:
 * `useRideTracker` tries it first and drops back to the foreground watcher
 * when it throws. The same JavaScript therefore records a ride in Expo Go with
 * the screen on, and records it with the screen off in a development build,
 * with no flag to set and nothing to remember.
 *
 * The task is defined at module scope on purpose. Expo dispatches events to
 * tasks before any component mounts — after the OS has restarted the app to
 * hand it a batch of locations, there is no component yet.
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

/** True once the OS is delivering fixes to the task. Throws nothing: callers
 *  treat false as "use the foreground watcher instead". */
export async function startBackground() {
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== "granted") return false;

    // "Allow all the time". Asked only after foreground has been granted,
    // which is the order Android requires and the order that does not read as
    // a demand before the app has shown it is worth anything.
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== "granted") return false;

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
    // Expo Go lands here, and so does any build without the entitlement.
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
