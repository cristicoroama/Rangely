// Extensions kept so the tests can import this under plain Node.
import { isEnergySample, packHealth } from "./ride.js";
import { weekStart } from "./goals.js";

/**
 * Levels and badges: something to work toward that is not speed.
 *
 * Levels are lifetime distance, the way running apps colour a runner by the
 * kilometres behind them — scaled down for scooters, with the first steps
 * close together so a new rider levels up in their first week. Badges reward
 * the things that make the app's numbers better (a measured range, a battery
 * health reading), distance, and consistency — never how fast anyone went.
 *
 * Everything here is computed from the ride list, nothing is stored: a
 * deleted ride takes its badge with it, and there is no state to go wrong.
 * No random rewards, no daily pressure — a week is the smallest unit of
 * effort that counts.
 */

export const LEVELS = [
  { key: "rookie", name: "Rookie", km: 0, colors: ["#9FB0A8", "#6F8580"] },
  { key: "cruiser", name: "Cruiser", km: 25, colors: ["#22D98E", "#12B8C9"] },
  { key: "explorer", name: "Explorer", km: 100, colors: ["#2FB8FF", "#5B6CFF"] },
  { key: "navigator", name: "Navigator", km: 250, colors: ["#8B5CFF", "#D946EF"] },
  { key: "voyager", name: "Voyager", km: 500, colors: ["#FF8A3D", "#FF4D6D"] },
  { key: "legend", name: "Legend", km: 1000, colors: ["#FFD24A", "#FF9F1C"] },
  { key: "electric", name: "Electric", km: 2500, colors: ["#F5F7FA", "#9AE6FF"] },
];

const totalKm = (rides) => (rides || []).reduce((a, r) => a + (r.distance || 0) / 1000, 0);

/** Where the rider stands: current level, the next one, and how far along. */
export function riderLevel(rides) {
  const km = totalKm(rides);
  let i = 0;
  while (i + 1 < LEVELS.length && km >= LEVELS[i + 1].km) i++;
  const level = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const fraction = next ? (km - level.km) / (next.km - level.km) : 1;
  return {
    index: i,
    level,
    next,
    km,
    fraction: Math.max(0, Math.min(1, fraction)),
    toNextKm: next ? Math.max(0, next.km - km) : 0,
  };
}

/**
 * Consecutive weeks with the goal met, counting back from this week — or
 * from last week, while this one is still in progress. A missed week ends
 * the run; nothing else does.
 */
export function goalStreak(rides, goalKm, now = Date.now()) {
  const byWeek = new Map();
  for (const r of rides || []) {
    if (!Number.isFinite(r.startedAt)) continue;
    const w = weekStart(r.startedAt);
    byWeek.set(w, (byWeek.get(w) || 0) + (r.distance || 0) / 1000);
  }
  const met = (w) => (byWeek.get(w) || 0) >= goalKm;
  const prev = (w) => {
    const d = new Date(w);
    return weekStart(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 3).getTime());
  };

  let w = weekStart(now);
  if (!met(w)) w = prev(w);
  let n = 0;
  while (met(w)) {
    n++;
    w = prev(w);
  }
  return n;
}

function weeksMet(rides, goalKm) {
  const byWeek = new Map();
  for (const r of rides || []) {
    if (!Number.isFinite(r.startedAt)) continue;
    const w = weekStart(r.startedAt);
    byWeek.set(w, (byWeek.get(w) || 0) + (r.distance || 0) / 1000);
  }
  let n = 0;
  for (const km of byWeek.values()) if (km >= goalKm) n++;
  return n;
}

const longest = (rides) => Math.max(0, ...(rides || []).map((r) => (r.distance || 0) / 1000));
const most = (rides, f) => Math.max(0, ...(rides || []).map(f));

/**
 * Each badge: what it is, how to get it, and a `progress(rides, ctx)` from 0
 * to 1. Earned is progress at 1. Kept small on purpose — a dozen badges you
 * can see all of beats a hundred nobody scrolls through.
 */
export const BADGES = [
  {
    key: "first-ride", name: "First ride", how: "Record your first ride", icon: "play",
    progress: (rides) => Math.min(1, rides.length),
  },
  {
    key: "five-k", name: "5 km ride", how: "Ride 5 km in one go", icon: "route",
    progress: (rides) => Math.min(1, longest(rides) / 5),
  },
  {
    key: "twenty-k", name: "Long haul", how: "Ride 20 km in one go", icon: "route",
    progress: (rides) => Math.min(1, longest(rides) / 20),
  },
  {
    key: "range", name: "Range finder", how: "Measure your real range on a ride", icon: "battery",
    progress: (rides) => (rides.some((r) => isEnergySample(r)) ? 1 : 0),
  },
  {
    key: "health", name: "Battery doctor", how: "Unlock your battery health", icon: "bolt",
    progress: (rides) => {
      const h = packHealth(rides);
      if (!h) return 0;
      return h.baseline ? 1 : Math.min(0.99, h.totalPct / (h.totalPct + h.needPct));
    },
  },
  {
    key: "goal", name: "Goal getter", how: "Hit your weekly goal", icon: "target",
    progress: (rides, ctx) => Math.min(1, weeksMet(rides, ctx.goalKm)),
  },
  {
    key: "four-weeks", name: "On a roll", how: "Hit your goal in 4 weeks", icon: "flame",
    progress: (rides, ctx) => Math.min(1, weeksMet(rides, ctx.goalKm) / 4),
  },
  {
    key: "hundred", name: "Century", how: "Ride 100 km in total", icon: "trophy",
    progress: (rides) => Math.min(1, totalKm(rides) / 100),
  },
  {
    key: "five-hundred", name: "Road hero", how: "Ride 500 km in total", icon: "star",
    progress: (rides) => Math.min(1, totalKm(rides) / 500),
  },
  {
    key: "climber", name: "Climber", how: "Climb 100 m in one ride", icon: "hill",
    progress: (rides) => Math.min(1, most(rides, (r) => r.ascent || 0) / 100),
  },
  {
    key: "early", name: "Early bird", how: "Start a ride before 8 in the morning", icon: "sun",
    progress: (rides) =>
      rides.some((r) => Number.isFinite(r.startedAt) && new Date(r.startedAt).getHours() < 8) ? 1 : 0,
  },
  {
    key: "ten-rides", name: "Regular", how: "Record 10 rides", icon: "calendar",
    progress: (rides) => Math.min(1, rides.length / 10),
  },
];

/** Every badge with its progress, earned ones first. */
export function badges(rides, { goalKm = 25 } = {}) {
  const list = rides || [];
  const out = BADGES.map((b, order) => {
    const progress = Math.max(0, Math.min(1, b.progress(list, { goalKm }) || 0));
    return { key: b.key, name: b.name, how: b.how, icon: b.icon, progress, earned: progress >= 1, order };
  });
  return out.sort((a, b) => (b.earned - a.earned) || (b.earned ? a.order - b.order : b.progress - a.progress));
}

/** Badges that `after` has and `before` did not — what a ride just unlocked. */
export function newlyEarned(before, after, opts) {
  const had = new Set(badges(before, opts).filter((b) => b.earned).map((b) => b.key));
  return badges(after, opts).filter((b) => b.earned && !had.has(b.key));
}
