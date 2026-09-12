# Rangely

An e-scooter ride tracker that answers the question no other tracker does:
**how far can you actually go on a charge?**

Strava and Komoot already do routes well. Neither knows what a battery is. Two
typed numbers — charge at the start, charge at the end — turn a GPS track into
real Wh/km, a measured range instead of the one printed on the box, and a
record of how that range fades as the pack ages.

## Status

Early. Foreground ride recording works and can be tried on a phone today.

- [x] Ride recording — distance, moving time, average and top speed, ascent
- [x] Energy — Wh used, Wh/km, measured full range
- [x] Local history and lifetime totals
- [x] Pack health — measured range now against measured range when you started
- [x] Background tracking — runs in a development build, falls back in Expo Go
- [ ] Accounts and a server
- [ ] Leaderboards — distance, streaks, city coverage
- [ ] City coverage map

### On leaderboards

There will not be a top-speed leaderboard. Ranking people by how fast they rode
on public roads pays them to ride dangerously, and e-scooters are capped at
25 km/h in most of Europe. Strava has been sued over exactly this. Distance,
streaks and coverage are competitive without that.

Your own top speed is still recorded and shown — it is your data. It just never
becomes a ranking.

## Running it

```bash
cd mobile
npm install
npm start          # then scan the QR code with Expo Go on Android
```

`npm test` runs the ride maths against a set of synthetic tracks. No test
runner, no toolchain — plain Node, so it works before anything is set up.

## Background tracking

A ride keeps recording with the phone in a pocket **in a development build**.
Expo Go cannot: the client app has no background location entitlement, so there
the screen is held awake for the length of a ride and the app must stay open.

Nothing has to be configured to get one or the other. `useRideTracker` asks for
the background task first and drops back to the foreground watcher when the
platform refuses it, so the same JavaScript does the best thing each build is
allowed to do, and the app says which one is running rather than promising
background recording that is not happening.

```bash
npx expo run:android          # or: eas build --profile development --platform android
```

What is not handled yet: a ride does not survive the app being killed
outright. The task is stopped and its fixes are dropped, rather than a
half-ride being silently resumed into the next one.

## Layout

```
mobile/
  App.js                  screens
  src/
    ride.js               the maths — pure, no React, no device APIs
    ride.test.mjs         tests for it
    useRideTracker.js     owns the GPS subscription, foreground or background
    backgroundLocation.js the TaskManager task and its permissions
    storage.js            local persistence
    ui.js, theme.js       presentation
```

`ride.js` holds everything that decides whether the numbers are true, kept free
of React so it can be tested without a phone. Five things in it exist because
the obvious version is wrong:

1. **Distance** ignores fixes with poor accuracy — a drifting fix while you
   stand still still "moves".
2. **Moving time** is counted apart from elapsed time, or two minutes at a red
   light makes every average a lie.
3. **Top speed** comes from a smoothed window rather than a single fix —
   otherwise one bad GPS sample reports 90 km/h on a scooter.
4. **Gaps** are not segments. A backgrounded app or a dead signal leaves a hole,
   and joining its two ends credits you with a kilometre at a perfectly
   plausible speed — wrong in a way that is invisible in the total. Anything
   longer than twenty seconds re-anchors instead, and the ride says how many
   holes it has.
5. **Ascent** has a dead band. GPS altitude wanders several metres while you
   stand still, and counting only the up-wanders turns a flat hour into 200 m
   of climbing.

The same rule covers the energy half: an empty battery field is not zero. Left
to `Number("")`, a skipped box reads as "ended at 0%" and invents a full
discharge, which is how a tracker ends up reporting a range nobody measured.
