import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";

import { haversine } from "./ride";
import { fetchCurrentWeather } from "./weather";

/** Weather this old, or from further away than this, is looked up again. */
const FRESH_MS = 30 * 60 * 1000;
const MOVED_M = 5000;

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

/**
 * Where the rider is and what the weather is doing there, for the home screen
 * — the centre of the "there and back" circle and the temperature that bends
 * it.
 *
 * It never asks for location on its own: it uses the permission if the rider
 * has already given it (they have, if they have recorded a ride), and waits
 * for a button press otherwise. A last known position is used when there is a
 * recent one, so opening the app does not wake the GPS just to draw a circle.
 *
 * `status` is "unknown" until the first check, then "ok", "denied" (can be
 * asked), "blocked" (only Settings can change it), or "nofix".
 */
export function useHere(active = true) {
  const [here, setHere] = useState({ status: "unknown", coords: null, weather: null });
  const busy = useRef(false);
  const looked = useRef({ at: 0, coords: null });

  const refresh = useCallback(async ({ ask = false } = {}) => {
    if (busy.current) return;
    busy.current = true;
    try {
      let perm = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (perm?.status !== "granted" && ask) {
        perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      }
      if (perm?.status !== "granted") {
        setHere((h) => ({ ...h, status: perm?.canAskAgain === false ? "blocked" : "denied" }));
        return;
      }

      let pos = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000, requiredAccuracy: 3000 }).catch(
        () => null,
      );
      if (!pos) {
        pos = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          15000,
        ).catch(() => null);
      }
      const c = pos?.coords;
      if (!c || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) {
        setHere((h) => ({ ...h, status: h.coords ? "ok" : "nofix" }));
        return;
      }
      const coords = { lat: c.latitude, lon: c.longitude, accuracy: c.accuracy };
      setHere((h) => ({ ...h, status: "ok", coords }));

      const prev = looked.current;
      const moved = !prev.coords || haversine(prev.coords, coords) > MOVED_M;
      if (moved || Date.now() - prev.at > FRESH_MS) {
        const weather = await fetchCurrentWeather(coords.lat, coords.lon);
        if (weather) {
          looked.current = { at: Date.now(), coords };
          setHere((h) => ({ ...h, weather }));
        }
      }
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    refresh();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") refresh();
    });
    return () => sub.remove();
  }, [active, refresh]);

  return { ...here, refresh };
}
