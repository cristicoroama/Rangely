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
- [ ] Background tracking (needs a development build, see below)
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

Recording currently stops when the app is backgrounded, and the screen is held
awake for the length of a ride to compensate.

This is a limitation of Expo Go, not a design choice: `expo-location`'s
background updates need a development build. Moving to one changes
`src/useRideTracker.js` and nothing else — the maths, storage and UI do not
know where fixes come from.

## Layout

```
mobile/
  App.js               screens
  src/
    ride.js            the maths — pure, no React, no device APIs
    ride.test.mjs      tests for it
    useRideTracker.js  owns the GPS subscription
    storage.js         local persistence
    ui.js, theme.js    presentation
```

`ride.js` holds everything that decides whether the numbers are true, kept free
of React so it can be tested without a phone. Three things in it exist because
the obvious version is wrong: distance ignores fixes with poor accuracy, moving
time is counted apart from elapsed time, and top speed comes from a smoothed
window rather than a single fix — otherwise one bad GPS sample reports 90 km/h
on a scooter.
