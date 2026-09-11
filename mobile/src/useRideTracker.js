import { useCallback, useRef, useState } from "react";
import * as Location from "expo-location";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { addPoint, emptyRide } from "./ride";

const KEEP_AWAKE_TAG = "rangely-ride";

/**
 * Owns the GPS subscription and folds fixes into ride state.
 *
 * FOREGROUND ONLY, on purpose for now. Background location on Expo needs a
 * development build — `startLocationUpdatesAsync` does not work in Expo Go —
 * and requiring a build before the first ride can be recorded would put a
 * toolchain between you and finding out whether the app is any good. So the
 * screen is held awake for the length of a ride and the app must stay open.
 * Moving to background tracking later changes this file and nothing else.
 */
export function useRideTracker() {
  const [state, setState] = useState(emptyRide);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState("");
  const sub = useRef(null);

  const start = useCallback(async () => {
    setError("");

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Location permission is required to record a ride.");
      return false;
    }

    // Fails on some devices when location services are switched off entirely,
    // which is a different problem from a denied permission and deserves a
    // different message.
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      setError("Turn on location services, then start the ride again.");
      return false;
    }

    setState(emptyRide());
    try {
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    } catch { /* not fatal — the ride just needs the screen left on */ }

    sub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        // One fix a second, and no distance gate: filtering belongs in
        // ride.js where it is tested, not in the platform's own heuristics
        // which differ between phones.
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (loc) => {
        const c = loc.coords;
        setState((s) =>
          addPoint(s, {
            lat: c.latitude,
            lon: c.longitude,
            alt: c.altitude,
            accuracy: c.accuracy,
            t: loc.timestamp,
          }),
        );
      },
    );

    setTracking(true);
    return true;
  }, []);

  const stop = useCallback(() => {
    sub.current?.remove?.();
    sub.current = null;
    try {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } catch { /* nothing to release */ }
    setTracking(false);
    // State is returned rather than cleared: the caller still has to write the
    // ride down, and wiping it here would throw away what was just recorded.
    return state;
  }, [state]);

  const reset = useCallback(() => setState(emptyRide()), []);

  return { state, tracking, error, start, stop, reset };
}
