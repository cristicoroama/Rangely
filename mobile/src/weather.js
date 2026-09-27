/**
 * Weather, from Open-Meteo: no key, no account, free for non-commercial use,
 * CC BY 4.0 — the credit line below has to be shown wherever the data is.
 *
 * Two questions, and nothing more:
 *
 *   - What is it like outside right now? For the "there and back" estimate: a
 *     lithium pack gives noticeably less at 5 °C than at 25 °C.
 *   - What was it like when this ride started? So a bad range figure has an
 *     explanation next to it instead of looking like a dying battery.
 *
 * Only a rough position ever leaves the phone. Coordinates are rounded to two
 * decimals — about a kilometre — which is finer than the weather model's own
 * grid, so nothing is lost; the route itself is never sent anywhere.
 *
 * The parsing and the arithmetic are pure and tested; the two fetches take
 * `fetch` as a parameter so the tests can hand them a canned answer.
 */

export const WEATHER_CREDIT = "Weather data by Open-Meteo.com";
export const WEATHER_CREDIT_URL = "https://open-meteo.com/";

const API = "https://api.open-meteo.com/v1/forecast";
const FIELDS = "temperature_2m,precipitation,weather_code,wind_speed_10m";

/** The forecast API keeps about three months of past hours. */
export const WEATHER_HISTORY_DAYS = 90;

/** ~1 km: enough for the weather, not enough to find a front door. */
export const roundCoord = (x) => Math.round(x * 100) / 100;

/* ------------------------------------------------------------ codes -- */

/**
 * WMO weather codes, folded into the handful a rider cares about. Icon names
 * are the app's own (ui.js).
 */
export function weatherKind(code) {
  const c = Number(code);
  if (!Number.isFinite(c)) return null;
  if (c === 0) return { key: "clear", label: "Clear", icon: "sun" };
  if (c === 1 || c === 2) return { key: "partly", label: "Partly cloudy", icon: "cloud" };
  if (c === 3) return { key: "cloudy", label: "Cloudy", icon: "cloud" };
  if (c === 45 || c === 48) return { key: "fog", label: "Fog", icon: "fog" };
  if (c === 56 || c === 57 || c === 66 || c === 67) return { key: "ice", label: "Freezing rain", icon: "snow" };
  if (c >= 51 && c <= 55) return { key: "drizzle", label: "Drizzle", icon: "rain" };
  if ((c >= 61 && c <= 65) || (c >= 80 && c <= 82)) return { key: "rain", label: "Rain", icon: "rain" };
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { key: "snow", label: "Snow", icon: "snow" };
  if (c >= 95) return { key: "storm", label: "Thunderstorm", icon: "storm" };
  return { key: "cloudy", label: "Cloudy", icon: "cloud" };
}

/** Wheels this small and a wet or frozen road: worth a warning. */
export function roadWarning(w) {
  if (!w) return null;
  const k = weatherKind(w.code)?.key;
  if (k === "ice" || k === "snow" || (Number.isFinite(w.tempC) && w.tempC <= 1 && (w.precipMm || 0) > 0)) {
    return { level: "danger", text: "Snow or ice on the road. Small wheels slip easily — better walk it today." };
  }
  if (k === "storm") return { level: "warn", text: "Thunderstorm about. Wait it out if you can." };
  if (k === "rain" || k === "drizzle" || (w.precipMm || 0) >= 0.5) {
    return { level: "warn", text: "Wet roads: brake earlier, and go easy on painted lines and metal covers." };
  }
  return null;
}

/* ---------------------------------------------------------- parsing -- */

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** One reading as the app keeps it. Small on purpose: it is stored on every ride. */
function reading(t, tempC, precipMm, code, windKmh) {
  if (num(tempC) == null) return null;
  return {
    t,
    tempC: Math.round(tempC * 10) / 10,
    precipMm: num(precipMm) ?? 0,
    code: num(code),
    windKmh: num(windKmh) == null ? null : Math.round(windKmh),
  };
}

/** `current` block of a response made with `timeformat=unixtime`. */
export function parseCurrent(json) {
  const c = json?.current;
  if (!c) return null;
  return reading(
    num(c.time) != null ? c.time * 1000 : Date.now(),
    c.temperature_2m, c.precipitation, c.weather_code, c.wind_speed_10m,
  );
}

/** The hourly reading nearest to `atMs`, from an `hourly` block in unixtime. */
export function parseHourAt(json, atMs) {
  const h = json?.hourly;
  if (!h || !Array.isArray(h.time) || !h.time.length) return null;
  let best = -1;
  let bestGap = Infinity;
  h.time.forEach((s, i) => {
    const gap = Math.abs(s * 1000 - atMs);
    if (num(h.temperature_2m?.[i]) != null && gap < bestGap) {
      best = i;
      bestGap = gap;
    }
  });
  // More than two hours away is someone else's weather.
  if (best < 0 || bestGap > 2 * 3600 * 1000) return null;
  return reading(
    h.time[best] * 1000,
    h.temperature_2m[best], h.precipitation?.[best], h.weather_code?.[best], h.wind_speed_10m?.[best],
  );
}

/* -------------------------------------------------------------- urls -- */

const base = (lat, lon) =>
  `${API}?latitude=${roundCoord(lat)}&longitude=${roundCoord(lon)}&timeformat=unixtime&wind_speed_unit=kmh`;

export const currentUrl = (lat, lon) => `${base(lat, lon)}&current=${FIELDS}`;

/** The hour a ride started in, as UTC — `start_hour` is read in the
 *  response's time zone, which is GMT when none is given. */
export function rideHourUrl(lat, lon, atMs) {
  const hour = new Date(Math.floor(atMs / 3600000) * 3600000).toISOString().slice(0, 13) + ":00";
  const next = new Date((Math.floor(atMs / 3600000) + 1) * 3600000).toISOString().slice(0, 13) + ":00";
  return `${base(lat, lon)}&hourly=${FIELDS}&start_hour=${hour}&end_hour=${next}`;
}

/* ------------------------------------------------------------ fetches -- */

async function getJson(url, fetchImpl, timeoutMs) {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(url, ctl ? { signal: ctl.signal } : undefined);
    if (!res?.ok) return null;
    return await res.json();
  } catch {
    // Offline, timed out, blocked: weather is a nice-to-have, never an error.
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchCurrentWeather(lat, lon, { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !fetchImpl) return null;
  return parseCurrent(await getJson(currentUrl(lat, lon), fetchImpl, timeoutMs));
}

/** Can this ride still be looked up? It needs a place, a time, and to be
 *  recent enough for the forecast API to remember. */
export function canLookUp(ride, now = Date.now()) {
  const p = ride?.track?.[0];
  return (
    !!ride && !ride.demo && !ride.weather &&
    Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]) &&
    Number.isFinite(ride.startedAt) &&
    now - ride.startedAt < WEATHER_HISTORY_DAYS * 86400000 &&
    (ride.weatherTries || 0) < 3
  );
}

/** The weather in the hour a ride started, where it started. */
export async function fetchRideWeather(ride, { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const p = ride?.track?.[0];
  if (!Array.isArray(p) || !fetchImpl) return null;
  const json = await getJson(rideHourUrl(p[0], p[1], ride.startedAt), fetchImpl, timeoutMs);
  return parseHourAt(json, ride.startedAt);
}

/* ---------------------------------------------------- cold and range -- */

/**
 * How much of its warm-weather range a pack gives at this temperature, as a
 * fraction. Lithium cells lose capacity and push out less power as they cool;
 * rider-measured figures for scooters land around 10–20% per 10 °C below
 * room temperature, so this takes 15% and stops at 40% off — below that the
 * scooter itself usually starts limiting power.
 */
export function coldFactor(tempC) {
  if (!Number.isFinite(tempC)) return 1;
  return Math.max(0.6, Math.min(1, 1 - 0.015 * Math.max(0, 20 - tempC)));
}

/** Scale a measured range from the temperature it was measured at to today's. */
export function tempAdjust(tempNow, tempMeasured) {
  if (!Number.isFinite(tempNow)) return 1;
  return coldFactor(tempNow) / coldFactor(Number.isFinite(tempMeasured) ? tempMeasured : 18);
}

/**
 * Cold rides against warm ones, from the rider's own measured rides — shown
 * only when both sides have enough battery behind them to mean something.
 * `rides` are energy samples (see isEnergySample in ride.js).
 */
export function coldInsight(samples, { coldBelow = 10, warmFrom = 15, minPct = 30 } = {}) {
  const side = (keep) => {
    const list = (samples || []).filter((r) => Number.isFinite(r.weather?.tempC) && keep(r.weather.tempC));
    const km = list.reduce((a, r) => a + r.distance / 1000, 0);
    const pct = list.reduce((a, r) => a + r.energy.usedPct, 0);
    return { rides: list.length, pct, kmPerPct: pct > 0 ? km / pct : null };
  };
  const cold = side((c) => c < coldBelow);
  const warm = side((c) => c >= warmFrom);
  if (cold.rides < 2 || warm.rides < 2 || cold.pct < minPct || warm.pct < minPct) return null;
  const lossPct = (1 - cold.kmPerPct / warm.kmPerPct) * 100;
  if (lossPct < 3) return null; // inside the noise
  return { cold, warm, lossPct, coldBelow, warmFrom };
}

/** "12°", or "−3°" with a real minus sign. */
export function fmtTemp(c) {
  if (!Number.isFinite(c)) return "";
  const r = Math.round(c);
  return `${r < 0 ? "−" : ""}${Math.abs(r)}°`;
}
