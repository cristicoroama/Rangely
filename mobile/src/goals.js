/**
 * The weekly goal: how Rangely asks a rider to come back.
 *
 * Deliberately a week and not a day. A daily streak is built to make you ride
 * today, whatever today is — in the rain, on ice, after dark, to keep a number
 * alive — and for a fourteen-year-old on a public road that is exactly the
 * wrong thing to optimise. A week absorbs a wet Tuesday. It also cannot be
 * lost by the evening, so there is never a reason for a "don't lose your
 * streak" nudge at nine o'clock at night.
 *
 * Pure: no React, no storage, tested in ride.test.mjs.
 */
const DAY_MS = 86400000;

export const DEFAULT_GOAL_KM = 25;

/** Monday 00:00, local time, of the week containing `ms`. Built from the
 *  calendar date rather than by subtracting milliseconds, so the week that
 *  crosses a clock change is still seven days long where the rider lives. */
export function weekStart(ms) {
  const d = new Date(ms);
  const sinceMonday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday).getTime();
}

function weekEnd(startMs) {
  const d = new Date(startMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime();
}

/** This week against the goal. */
export function weeklyProgress(rides, goalKm = DEFAULT_GOAL_KM, now = Date.now()) {
  const start = weekStart(now);
  const end = weekEnd(start);
  const inWeek = (rides || []).filter(
    (r) => Number.isFinite(r.startedAt) && r.startedAt >= start && r.startedAt < end,
  );
  const km = inWeek.reduce((a, r) => a + (r.distance || 0) / 1000, 0);
  const goal = goalKm > 0 ? goalKm : DEFAULT_GOAL_KM;

  return {
    km,
    goalKm: goal,
    fraction: Math.min(1, km / goal),
    rides: inWeek.length,
    met: km >= goal,
    // Including today: on a Sunday there is still one day left to ride.
    daysLeft: Math.max(1, Math.ceil((end - now) / DAY_MS)),
  };
}

/** The last `n` weeks, oldest first, for the little row of bars under the
 *  ring. Meeting the goal is marked, missing it is simply a shorter bar —
 *  nothing is "broken". */
export function recentWeeks(rides, goalKm = DEFAULT_GOAL_KM, now = Date.now(), n = 6) {
  const out = [];
  let start = weekStart(now);
  for (let i = 0; i < n; i++) {
    const end = weekEnd(start);
    const km = (rides || [])
      .filter((r) => Number.isFinite(r.startedAt) && r.startedAt >= start && r.startedAt < end)
      .reduce((a, r) => a + (r.distance || 0) / 1000, 0);
    out.unshift({ start, km, met: km >= goalKm });
    const d = new Date(start);
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7).getTime();
  }
  return out;
}
