/**
 * The law, as data.
 *
 * Every figure here has a date because every figure here is moving: Romania
 * has bills in parliament for a minimum age of 16 and a helmet for everyone,
 * Spain changes both on 1 October 2026, Paris changed its helmet rule in
 * August. Anything the app says about the law is read from this file, so a
 * change in the law is a change in one place — and the date tells whoever
 * reads it how stale the claim is.
 *
 * Sources and articles: see the research dossier (Codul Rutier art. 41, 70,
 * 100–101; HG 1391/2006 art. 161; OG 2/2001 art. 11; Legea 181/2025).
 */
export const RULES = {
  RO: {
    updated: "2026-09-21",
    minAge: 14,          // public roads, including pavements and bike lanes
    helmetUnder: 16,     // on the roadway
    maxKmh: 25,          // the legal definition of an e-scooter
    passengers: false,
    lightsAtNight: true,
  },
};

export const LOCAL = RULES.RO;

/** Age brackets rather than a birth date: enough to know which rules apply,
 *  and nothing more personal than that is kept. */
export const AGE_BRACKETS = [
  { key: "under14", label: "Under 14" },
  { key: "14-15", label: "14–15" },
  { key: "16-17", label: "16–17" },
  { key: "18+", label: "18 or older" },
];

export const needsHelmetByLaw = (bracket) => bracket === "under14" || bracket === "14-15";

/**
 * Sunset and sunrise, roughly, for Romania.
 *
 * Close enough to decide whether to show the lights-and-reflectors check
 * before a ride — within about a quarter of an hour across the year, which is
 * why the check starts fifteen minutes early. A sun-position library would be
 * exact and several hundred lines for a reminder.
 *
 * Day length at ~44.4°N swings between about 8.9 and 15.5 hours; solar noon in
 * Bucharest falls about 12:16 standard time.
 */
export function daylight(now = Date.now()) {
  const d = new Date(now);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const doy = Math.floor((d - jan1) / 86400000) + 1;
  const dayLength = 12.2 + 3.28 * Math.sin((2 * Math.PI * (doy - 80)) / 365);
  // Offset from Romanian standard time (UTC+2), which is how DST shows up.
  const offsetHours = -d.getTimezoneOffset() / 60 - 2;
  const noon = 12.27 + offsetHours;
  return { sunrise: noon - dayLength / 2, sunset: noon + dayLength / 2 };
}

export function isAfterDark(now = Date.now()) {
  const d = new Date(now);
  const h = d.getHours() + d.getMinutes() / 60;
  const { sunrise, sunset } = daylight(now);
  return h >= sunset - 0.25 || h < sunrise + 0.25;
}
