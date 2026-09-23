# Rangely

An e-scooter ride tracker that answers the question no other tracker does:
**how far can you actually go on a charge?**

Strava and Komoot already do routes well. Neither knows what a battery is. Two
typed numbers — charge at the start, charge at the end — turn a GPS track into
real Wh/km, a measured range instead of the one printed on the box, and a
record of how that range fades as the pack ages.

## Status

Early, and riding on a phone. Built for riders from 14 up, so the bar is: a
first-time rider understands every screen without being told.

- [x] Ride recording — distance, moving time, average speed, ascent, pause and resume
- [x] Energy — km per 1% of battery, measured full range, Wh/km
- [x] Battery health — measured range now against when the record started
- [x] Weekly goal — a ring that fills, the last six weeks under it, weeks-in-a-row
- [x] Levels and badges — lifetime distance levels, twelve badges, never for speed
- [x] Onboarding — three screens: what it does, age group, which scooter
- [x] Rules — Romanian scooter law as dated data, and a dusk check before riding
- [x] Route map — the ride drawn on OpenStreetMap, live while you ride
- [x] Light and dark — follows the phone
- [x] Background tracking — in a development build or APK
- [ ] Accounts and a server
- [ ] Leaderboards — distance and coverage, never speed
- [ ] City coverage map

### On leaderboards

There will not be a top-speed leaderboard. Ranking people by how fast they rode
on public roads pays them to ride dangerously, and e-scooters are capped at
25 km/h in most of Europe. Strava has been sued over exactly this. Distance and
coverage are competitive without that.

Your own top speed is still recorded and shown on a ride's own page — it is
your data. It is never the headline and never a ranking; the live screen only
mentions speed to say "over 25 km/h — ease off".

## Running it

```bash
cd mobile
npm install
npx expo run:android     # builds, installs and starts it on a phone over USB
```

The UI runs on Reanimated 4 (with `react-native-worklets`), `expo-haptics`,
`expo-font` and `react-native-safe-area-context`, all native modules — so after pulling a
change that adds one, it is `npm install` and `npx expo run:android` again, not
just a reload. Expo Go is no longer the target.

`npm test` runs the ride maths against a set of synthetic tracks. No test
runner, no toolchain — plain Node, so it works before anything is set up.

It also runs in a browser, which is the quickest way to look at the screens on
a desktop. Recording is useless there — a laptop locates itself by wifi, to
within a few hundred metres, and every one of those fixes is thrown out — but
the layout is the layout:

```bash
npx expo install react-dom react-native-web @expo/metro-runtime
npx expo start --web
```

A development build also carries a **Development** card at the bottom of the
Scooter tab: a demo history (seventeen invented rides over three months, with
the pack fading as it goes, two of them today) so battery health, the weekly
ring and the history can be judged without a month of riding first; a button to
remove it again; and one to replay the welcome screens. The rides are marked
"Demo", and the card does not exist in a release build.

## Testing a ride without going outside

```bash
npx expo run:android      # builds and installs on a phone or emulator
npm run testride          # writes tools/test-ride.gpx and its expected numbers
```

Android Studio's emulator replays a GPX track as real GPS fixes — Extended
controls › Location › import the file, then Play — so recording can be tested
at a desk, with the same ride every time.

`npm run testride` builds that ride out of legs whose distance, duration and
climb are known by construction: a cruise, a red light with the phone drifting
where it stands, a 40 m climb, a descent, a sprint, and a wait at the end. Then
it runs the very same fixes through `ride.js` and prints both — what the ride
physically was, and what the app must therefore show. A disagreement between
the app on screen and that second block is a bug, not an argument about what
the GPS meant.

## The map

Every ride keeps a thinned track — a point every ten metres, which is shape
enough to draw and small enough to store — and it is drawn two different ways,
for the same reason Strava does: **the list gets an outline, one ride at a time
gets a map.**

`RouteShape` is the outline: pure SVG over `src/slippy.js`, no tiles, no
network, no key, no cost. You recognise a ride by its shape long before you
recognise it by its distance, and twenty native map views in a scrolling list
is how a feed starts stuttering.

`RouteMap` is Leaflet in a WebView over OpenStreetMap's own tiles: pan, pinch,
zoom, street names, the route on top, and a pulsing dot that follows you while
you ride. In the light theme the tiles are shown as they come; in the dark one
they are inverted and hue-rotated back in CSS, so there is one tile source, no
key, no account and no watermark — just the credit in the corner, which is the
whole of the licence.

Two things to know before a store release: Leaflet itself is loaded from unpkg,
and the tiles come straight from openstreetmap.org, so the rider's IP address
reaches both while a map is on screen. The privacy note in the app says so;
bundling Leaflet into the app would remove the first.

### Why not Google Maps

It was the first choice and it lost on one fact. Google's mobile maps stopped
being unconditionally free on 1 March 2025: the $200 monthly credit was
replaced by per-SKU free allowances — 10,000 calls a month for Essentials SKUs,
which is where a dynamic map sits — and getting a key at all requires a billing
account with a card on it. Ten thousand map opens is far more than this app
will ever use, so the money was never the problem; needing a card, a quota and
a key baked into every build, to draw a line on a street, was.

Leaflet costs none of that and loses three things: satellite imagery, Google's
business listings, and live traffic. None of them tell you how far you can go
on a charge.

If that trade ever stops making sense, `src/realMap.js` is the only file that
changes — every screen asks for `RouteMap`, never for an implementation — and
`app.config.js` is already wired to merge a `GOOGLE_MAPS_API_KEY` in from the
environment rather than from the repository.

## Building an APK

Expo Go is a borrowed app; an APK is this one. It is also the only way to get
background recording, since the entitlement belongs to the build and not to the
JavaScript.

```bash
npm install -g eas-cli
eas login
eas init                       # links the project to your Expo account, once
eas build -p android --profile preview
```

`preview` produces a standalone APK you install and forget — no laptop, no
Metro, no QR code. EAS builds it in the cloud and hands back a download link,
so no Android Studio and no SDK are needed locally. The first build asks to
generate a keystore; say yes and EAS keeps it, or the next build will not be an
update of the same app.

One thing that changes in an APK: `__DEV__` is false, so the **Development**
card and its demo history are not in it. That is the point of the flag, but it
means pack health on a fresh install starts empty again and fills up as you
ride. For a build that keeps the card and reloads from Metro, use
`--profile development` instead and add `expo-dev-client` first.

## Background tracking

A ride keeps recording with the phone in a pocket **in a development build**.
Expo Go cannot: the client app has no background location entitlement, so there
the screen is held awake for the length of a ride and the app must stay open.

Nothing has to be configured to get one or the other. `useRideTracker` tries the
background task first and drops back to the foreground watcher when the
platform refuses it, so the same JavaScript does the best thing each build is
allowed to do, and the app says which one is running rather than promising
background recording that is not happening.

Asking for the permission is deliberately NOT part of starting a ride. On
Android 12 and later an app may not start a foreground service while it is in
the background, and a permission dialog — or the settings page Android opens
for "allow all the time" — puts it there. Requesting it and then starting the
service throws `ForegroundServiceStartNotAllowedException`, which is a native
crash rather than a rejected promise: the app simply closes, with no error to
show. So the permission is only ever checked before a ride, requested from its
own button, and the service waits for the activity to be resumed before it
starts.

```bash
npx expo run:android          # or: eas build --profile development --platform android
```

`RECEIVE_BOOT_COMPLETED` is in the Android permission list and is not
decoration. `expo-task-manager` delivers background locations through a
JobScheduler job marked persisted, and Android refuses to schedule a persisted
job without that permission — `IllegalArgumentException: requested job be
persisted without holding RECEIVE_BOOT_COMPLETED permission`, thrown on the
main looper when the first fix arrives, which closes the app a second after the
ride starts. Nothing in the JavaScript can catch it.

What is not handled yet: a ride does not survive the app being killed
outright. The task is stopped and its fixes are dropped, rather than a
half-ride being silently resumed into the next one.

## Design

The research behind it is in the dossier; the short version:

- **Readable on a handlebar.** The live screen is one number you can read from
  arm's length in under a second (104 pt), three under it, the map, and two
  controls that cannot be confused: tap to pause, **hold** to finish, so a bump
  in the road never ends a ride.
- **Light by day, dark at night.** A dark screen at noon is unreadable; the
  app follows the phone, and the light palette is the one tuned for sunlight.
- **Motion that explains, never decorates.** Presses sink and spring back,
  cards arrive in reading order, the goal ring fills when you come back from
  saving a ride, the distance counts up at the end. Everything is under
  300 ms except that last moment, and "reduce motion" is honoured.
- **Felt as well as seen.** Starting, pausing, the ticks while holding to
  finish and the save all have a haptic, because a rider's eyes are on the road.
- **One brand, used sparingly.** Plus Jakarta Sans for words, Barlow Condensed
  for numbers (both bundled, both with tabular figures), and one electric
  green-to-aqua gradient that only the important things get: the goal ring,
  the start button, earned badges. The top of home, the ride screen and the
  end of a ride sit on a deep, lit "hero" panel that is dark in both themes.
- **Nothing to type.** The battery is a battery you drag, with − and + for
  the last percent and one-tap answers ("Full", "where the last ride ended").
  A scooter that shows five bars gets five bars to tap instead.
- **Ask with a reason.** Before Android's location dialog, a sheet says why
  and what to choose — a denied location is the one thing that breaks the app.
- **Levels and badges, never speed.** Levels come from lifetime distance;
  badges reward measuring range, unlocking battery health, weekly goals and
  distance. Everything is computed from the rides, nothing extra is stored.
- **A weekly goal, not a streak.** Streaks punish a rainy day; a weekly target
  forgives one, and nothing is ever shown as "broken".
- **The law as data.** `src/rules.js` holds the Romanian rules with the date
  they were checked, the age group chosen at the start decides which ones are
  highlighted, and after sunset the home screen asks for lights, something
  bright and a helmet before the ride.

## Layout

```
mobile/
  App.js                  which screen is up, and the ride's save/discard flow
  app.config.js           merges the Maps API key in from the environment
  eas.json                build profiles — preview is the installable APK
  tools/
    makeTestRide.mjs      synthetic GPX + the numbers the app should show
  src/
    ride.js               the maths — pure, no React, no device APIs
    goals.js              weekly goal, Monday to Sunday
    achievements.js       levels, badges, weeks-in-a-row — computed, not stored
    rules.js              the law, dated; sunset for the dusk check
    scooters.js           presets with pack sizes; battery display types
    ride.test.mjs         tests for all of the above
    useRideTracker.js     owns the GPS: start, pause, resume, stop
    backgroundLocation.js the TaskManager task and its permissions
    slippy.js             web mercator — zoom, tiles, projection
    map.js                which of the two map components to use, and why
    routeShape.js         the drawn outline — SVG, free, for lists
    realMap.js            Leaflet in a WebView — pan, zoom, live position
    demoRides.js          invented history for the development seed
    storage.js            rides, scooter and profile, on the phone
    theme.js              palettes, brand gradient, bundled fonts, type scale
    motion.js             durations, curves, springs, reduce-motion
    haptics.js            vibration that can never throw
    ui.js                 buttons, cards, stats, pills, icons
    when.js, useNow.js, useKeyboard.js
    components/           goal ring, hold button, battery slider, medals,
                          confetti, hero panel, scooter drawing…
    screens/              Onboarding, Home, Ride, Finish, History,
                          RideDetail, Scooter
  assets/fonts/           Plus Jakarta Sans, Barlow Condensed (SIL OFL)
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
