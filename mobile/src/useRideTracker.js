import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { addPoint, emptyRide, pauseRide } from "./ride";
import {
  hasBackgroundPermission,
  isBackgroundRunning,
  requestBackgroundPermission,
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

/** Releasing a lock that was never taken rejects — asynchronously, so a
 *  try/catch alone lets it escape as an unhandled rejection. */
function releaseKeepAwake() {
  try {
    deactivateKeepAwake(KEEP_AWAKE_TAG)?.catch?.(() => {});
  } catch {
    /* nothing to release */
  }
}

/**
 * Owns the GPS subscription and folds fixes into ride state.
 *
 * Two sources, one behaviour. Where the permission and the entitlement exist,
 * a real background task keeps recording with the phone in a pocket; where
 * they do not — Expo Go, or "while using the app" — the screen is held awake
 * and the app must stay open. Which one is running is decided by what the
 * platform actually allows, not by a flag someone has to remember to flip, and
 * `mode` says which, so the UI can be honest instead of promising background
 * recording that is not happening.
 *
 * A pause closes the source outright rather than ignoring fixes: no GPS, no
 * wake lock and no notification while you are in a shop, and the next fix
 * after resuming starts a new segment instead of drawing a straight line from
 * wherever you stopped (see `pauseRide` in ride.js).
 *
 * Nothing in here requests the background permission on its own. That is a
 * separate button (`enableBackground`) for a reason worth remembering: on
 * Android the request sends the user out to a settings screen, and starting a
 * foreground service on the way back is a native crash rather than an error
 * that can be caught.
 */
export function useRideTracker() {
  const [state, setState] = useState(emptyRide);
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mode, setMode] = useState(null); // "background" | "foreground" | null
  const [canBackground, setCanBackground] = useState(false);
  const [error, setError] = useState("");
  // The ride clock: wall time since start, minus every pause. Kept apart from
  // the ride's own `elapsed`, which only moves when a fix arrives — a clock
  // that stops ticking at a red light looks broken.
  const [clock, setClock] = useState({ startedAt: null, pausedAt: null, pausedMs: 0 });

  const sub = useRef(null);
  // stop() has to hand back what was actually recorded. Reading it out of the
  // render closure hands back whatever React had rendered by then, which is
  // the last second or two of a ride missing for no visible reason.
  const latest = useRef(state);

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
    hasBackgroundPermission().then((ok) => {
      if (alive) setCanBackground(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  const closeSource = useCallback(() => {
    sub.current?.remove?.();
    sub.current = null;
    setSink(null);
    stopBackground();
    releaseKeepAwake();
  }, []);

  // Unmounting mid-ride must not leave the GPS subscription, the wake lock or
  // the background service behind.
  useEffect(() => closeSource, [closeSource]);

  /** Background task if the platform allows it, the foreground watcher with
   *  the screen held on if not. Returns the mode that is now running. */
  const openSource = useCallback(async () => {
    setSink(fold);
    if (await startBackground()) {
      setCanBackground(true);
      return "background";
    }

    // No background task: the screen has to stay on, so take the wake lock
    // before the watcher rather than after.
    setSink(null);
    try {
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    } catch {
      /* not fatal — the ride just needs the screen left on */
    }
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
    return "foreground";
  }, [fold]);

  /** Ask for "allow all the time". Returns whether it was granted; the next
   *  ride is the one that uses it. */
  const enableBackground = useCallback(async () => {
    const ok = await requestBackgroundPermission();
    setCanBackground(ok);
    return ok;
  }, []);

  /** Returns { ok, error, mode } — the message comes back with the result
   *  because a caller reading `error` from state right after this resolves
   *  reads the value from before the call. */
  const start = useCallback(async () => {
    setError("");

    const fail = (msg) => {
      closeSource();
      setError(msg);
      setMode(null);
      return { ok: false, error: msg };
    };

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return fail("Rangely needs your location to record a ride.");
      }
      // A different problem from a denied permission, and it deserves a
      // different message.
      if (!(await Location.hasServicesEnabledAsync())) {
        return fail("Location is switched off on this phone. Turn it on, then start again.");
      }

      const fresh = emptyRide();
      latest.current = fresh;
      setState(fresh);
      setPaused(false);
      setClock({ startedAt: Date.now(), pausedAt: null, pausedMs: 0 });

      const running = await openSource();
      setMode(running);
      setTracking(true);
      return { ok: true, error: "", mode: running };
    } catch (e) {
      // Anything the platform throws — a revoked permission, a service the OS
      // refuses to start — ends here as a message on screen. An escaped
      // rejection in a release build is a silent close, which is the one
      // failure a rider cannot report and cannot work around.
      return fail(e?.message ? `Could not start: ${e.message}` : "Could not start the GPS.");
    }
  }, [closeSource, openSource]);

  const pause = useCallback(() => {
    if (!tracking || paused) return;
    closeSource();
    setState((s) => {
      const next = pauseRide(s);
      latest.current = next;
      return next;
    });
    setPaused(true);
    setClock((c) => ({ ...c, pausedAt: Date.now() }));
  }, [tracking, paused, closeSource]);

  const resume = useCallback(async () => {
    if (!tracking || !paused) return { ok: true };
    try {
      const running = await openSource();
      setMode(running);
      setPaused(false);
      setClock((c) => ({
        ...c,
        pausedAt: null,
        pausedMs: c.pausedMs + (c.pausedAt ? Date.now() - c.pausedAt : 0),
      }));
      return { ok: true };
    } catch (e) {
      closeSource();
      const msg = e?.message ? `Could not resume: ${e.message}` : "Could not restart the GPS.";
      setError(msg);
      return { ok: false, error: msg };
    }
  }, [tracking, paused, openSource, closeSource]);

  const stop = useCallback(() => {
    closeSource();
    setTracking(false);
    setPaused(false);
    setMode(null);
    // State is returned rather than cleared: the caller still has to write the
    // ride down, and wiping it here would throw away what was just recorded.
    return latest.current;
  }, [closeSource]);

  const reset = useCallback(() => {
    const fresh = emptyRide();
    latest.current = fresh;
    setState(fresh);
    setClock({ startedAt: null, pausedAt: null, pausedMs: 0 });
  }, []);

  return {
    state, tracking, paused, mode, error, canBackground, clock,
    start, pause, resume, stop, reset, enableBackground,
  };
}

/** Milliseconds on the ride clock at `now`: running time, pauses left out. */
export function clockMs(clock, now = Date.now()) {
  if (!clock?.startedAt) return 0;
  const end = clock.pausedAt ?? now;
  return Math.max(0, end - clock.startedAt - (clock.pausedMs || 0));
}
