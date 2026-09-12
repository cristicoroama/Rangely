import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { addPoint, emptyRide } from "./ride";
import {
  isBackgroundRunning,
  setSink,
  startBackground,
  stopBackground,
} from "./backgroundLocation";

const KEEP_AWAKE_TAG = "rangely-ride";

/** A fix as the rest of the app wants it, from whichever source produced it. */
function toPoint(loc) {
  const c = loc?.coords ?? {};
  return {
    lat: c.latitude,
    lon: c.longitude,
    alt: c.altitude,
    accuracy: c.accuracy,
    altAccuracy: c.altitudeAccuracy,
    t: loc?.timestamp,
  };
}

/**
 * Owns the GPS subscription and folds fixes into ride state.
 *
 * Two sources, one behaviour. A development build gets a real background task
 * and an Android foreground-service notification, so the ride keeps recording
 * with the phone in a pocket. Expo Go cannot, so the screen is held awake and
 * the app must stay open. Which one is in use is decided by trying the better
 * one and seeing whether the platform allows it — never by a flag someone has
 * to remember to flip before a build.
 *
 * `mode` says which is running, so the UI can be honest about it rather than
 * promising background recording that is not happening.
 */
export function useRideTracker() {
  const [state, setState] = useState(emptyRide);
  const [tracking, setTracking] = useState(false);
  const [mode, setMode] = useState(null); // "background" | "foreground" | null
  const [error, setError] = useState("");

  const sub = useRef(null);
  // stop() has to hand back what was actually recorded. Reading it out of the
  // render closure hands back whatever React had rendered by then, which is
  // the last second or two of a ride missing for no visible reason.
  const latest = useRef(state);
  const modeRef = useRef(null);

  const fold = useCallback((loc) => {
    setState((s) => {
      const next = addPoint(s, toPoint(loc));
      latest.current = next;
      return next;
    });
  }, []);

  // A task left running by a force-quit or a crash keeps a notification alive
  // and burns battery for a ride nobody is looking at any more. Its fixes are
  // lost either way — the sink died with the previous process.
  useEffect(() => {
    let alive = true;
    isBackgroundRunning().then((running) => {
      if (alive && running) stopBackground();
    });
    return () => {
      alive = false;
    };
  }, []);

  // Unmounting mid-ride must not leave the GPS subscription, the wake lock or
  // the background service behind.
  useEffect(
    () => () => {
      sub.current?.remove?.();
      sub.current = null;
      setSink(null);
      stopBackground();
      try {
        deactivateKeepAwake(KEEP_AWAKE_TAG);
      } catch {
        /* nothing to release */
      }
    },
    [],
  );

  /** Returns { ok, error } — the message comes back with the result because a
   *  caller reading `error` from state right after this resolves reads the
   *  value from before the call. */
  const start = useCallback(async () => {
    setError("");

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      const msg = "Location permission is required to record a ride.";
      setError(msg);
      return { ok: false, error: msg };
    }

    // Fails on some devices when location services are switched off entirely,
    // which is a different problem from a denied permission and deserves a
    // different message.
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      const msg = "Turn on location services, then start the ride again.";
      setError(msg);
      return { ok: false, error: msg };
    }

    const fresh = emptyRide();
    latest.current = fresh;
    setState(fresh);

    setSink(fold);
    const background = await startBackground();

    if (background) {
      modeRef.current = "background";
      setMode("background");
    } else {
      setSink(null);
      modeRef.current = "foreground";
      setMode("foreground");
      try {
        await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      } catch {
        /* not fatal — the ride just needs the screen left on */
      }

      try {
        sub.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            // One fix a second, and no distance gate: filtering belongs in
            // ride.js where it is tested, not in the platform's own heuristics
            // which differ between phones.
            timeInterval: 1000,
            distanceInterval: 0,
          },
          fold,
        );
      } catch {
        const msg = "Could not start the GPS. Try again in a moment.";
        setError(msg);
        modeRef.current = null;
        setMode(null);
        try {
          deactivateKeepAwake(KEEP_AWAKE_TAG);
        } catch {
          /* nothing to release */
        }
        return { ok: false, error: msg };
      }
    }

    setTracking(true);
    return { ok: true, error: "", mode: modeRef.current };
  }, [fold]);

  const stop = useCallback(() => {
    sub.current?.remove?.();
    sub.current = null;
    setSink(null);
    stopBackground();
    try {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } catch {
      /* nothing to release */
    }
    setTracking(false);
    modeRef.current = null;
    setMode(null);
    // State is returned rather than cleared: the caller still has to write the
    // ride down, and wiping it here would throw away what was just recorded.
    return latest.current;
  }, []);

  const reset = useCallback(() => {
    const fresh = emptyRide();
    latest.current = fresh;
    setState(fresh);
  }, []);

  return { state, tracking, mode, error, start, stop, reset };
}
