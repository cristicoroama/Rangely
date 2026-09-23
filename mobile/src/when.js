/**
 * Dates and times, written out by hand.
 *
 * Hermes ships a partial Intl, and what `toLocaleString` returns differs
 * between phones — one says "9/14/2026, 6:40:12 PM", the next "14.09.2026".
 * A ride list needs one format that reads the same everywhere, so it is built
 * from the parts.
 */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n) => String(n).padStart(2, "0");

function startOfDay(ms) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "18:40" */
export function timeLabel(ms) {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "14 Sep" */
export function shortDate(ms) {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Today", "Yesterday", "Mon 14 Sep", or "14 Sep 2025" once it is a year old. */
export function dayLabel(ms, now = Date.now()) {
  if (!Number.isFinite(ms)) return "";
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const d = new Date(ms);
  if (d.getFullYear() !== new Date(now).getFullYear()) {
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function greeting(now = Date.now()) {
  const h = new Date(now).getHours();
  if (h < 5) return "Late ride?";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** "1 ride", "3 rides" */
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
