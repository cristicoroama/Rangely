/**
 * Auto-pause: the ride clock stops by itself at a red light and starts again
 * when the wheels do.
 *
 * Distance and average speed were already honest without it — ride.js only
 * counts moving time — but a clock that keeps running through every crossing
 * says a 20-minute ride took 31, and that is the number people read. Strava
 * does the same thing for rides, from GPS speed.
 *
 * Two thresholds rather than one, so a rider rolling at walking pace next to
 * a queue does not flicker between paused and running: it takes a few
 * seconds under STOP to pause, and a clear push past GO to resume. The
 * seconds spent slowing down before the pause kicks in are taken back out,
 * so the clock reads as if it had stopped the moment the scooter did.
 *
 * Pure and driven by fix timestamps, not by the wall clock: background fixes
 * arrive in batches, and every fix in a batch has to be judged by the moment
 * it was taken.
 */
export const AUTO_PAUSE = {
  stopBelowMs: 0.8, // ≈ 2.9 km/h
  goAboveMs: 1.5, // ≈ 5.4 km/h
  afterMs: 6000,
};

export function idleAuto() {
  return { paused: false, stillSince: null, pausedAt: null, pausedMs: 0, count: 0 };
}

/**
 * Feed one speed reading (m/s) taken at `t` (ms). Returns the next state, with
 * `event` set to "pause" or "resume" on the reading that changed it.
 */
export function autoPauseStep(a, speedMs, t, opts = AUTO_PAUSE) {
  const s = a ?? idleAuto();
  if (!Number.isFinite(speedMs) || speedMs < 0 || !Number.isFinite(t)) return { ...s, event: null };

  if (!s.paused) {
    if (speedMs < opts.stopBelowMs) {
      const since = s.stillSince ?? t;
      if (t - since >= opts.afterMs) {
        return { ...s, paused: true, pausedAt: since, stillSince: null, count: s.count + 1, event: "pause" };
      }
      return { ...s, stillSince: since, event: null };
    }
    return { ...s, stillSince: null, event: null };
  }

  if (speedMs >= opts.goAboveMs) {
    return {
      ...s,
      paused: false,
      pausedMs: s.pausedMs + Math.max(0, t - s.pausedAt),
      pausedAt: null,
      stillSince: null,
      event: "resume",
    };
  }
  return { ...s, event: null };
}

/** Close an open auto-pause at `t` — used when the rider pauses by hand, or
 *  finishes, while the clock is already stopped. */
export function autoPauseEnd(a, t) {
  if (!a?.paused) return { ...(a ?? idleAuto()), stillSince: null, event: null };
  return {
    ...a,
    paused: false,
    pausedMs: a.pausedMs + Math.max(0, t - a.pausedAt),
    pausedAt: null,
    stillSince: null,
    event: null,
  };
}

/** Milliseconds the clock has spent auto-paused, up to `now`. */
export function autoPausedMs(a, now) {
  if (!a) return 0;
  return a.pausedMs + (a.paused && Number.isFinite(a.pausedAt) ? Math.max(0, now - a.pausedAt) : 0);
}
