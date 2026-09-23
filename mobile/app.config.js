/**
 * The Google Maps key, kept out of the repository.
 *
 * `app.json` holds everything about this app that is safe to read in public.
 * An API key is not that: a key committed to a repository is a key someone
 * else's app is using by the time you notice. Expo merges this file over
 * app.json, so the key arrives from the environment at build time and the
 * checked-in config stays clean.
 *
 * Set it before building:
 *
 *   PowerShell:  $env:GOOGLE_MAPS_API_KEY="AIza..."
 *   or put GOOGLE_MAPS_API_KEY=AIza... in mobile/.env  (gitignored)
 *
 * For EAS builds it goes in as a secret rather than a file:
 *
 *   eas secret:create --name GOOGLE_MAPS_API_KEY --value AIza...
 *
 * Without a key the app still runs; the map view is simply blank, which is
 * Google's way of saying the same thing.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "" },
    },
  },
});
