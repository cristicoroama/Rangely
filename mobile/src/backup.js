/**
 * A backup is one JSON file with everything Rangely knows: the rides, the
 * scooter and the settings. There is no account, so without it a lost or
 * reset phone takes the whole history with it.
 *
 * Plain JSON on purpose — readable in any text editor, and nothing about it
 * locks the rides inside this app.
 *
 * Restoring merges rather than replaces: rides already on the phone stay,
 * rides from the file that are not there are added, matched by id (a ride's
 * id is its start time, so the same ride has the same id everywhere). Running
 * a restore twice changes nothing the second time.
 *
 * Pure: the file picking lives in backupFile.js.
 */
export const BACKUP_KIND = "rangely-backup";
export const BACKUP_VERSION = 1;

/** Settings worth carrying across; everything else is this phone's own. */
const PROFILE_KEYS = ["ageBracket", "goalKm", "autoPause"];

export function buildBackup({ rides, scooter, profile, appVersion = null, now = Date.now() }) {
  // The photo is a file in this phone's app folder; its path means nothing
  // anywhere else, and the picture itself would make the file enormous.
  const { photo: _photo, ...scooterOut } = scooter || {};
  const profileOut = {};
  for (const k of PROFILE_KEYS) if (profile && k in profile) profileOut[k] = profile[k];
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: now,
    appVersion,
    scooter: scooterOut,
    profile: profileOut,
    rides: (rides || []).filter(Boolean),
  };
}

export function backupFileName(now = Date.now()) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, "0");
  return `rangely-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

const isRide = (r) =>
  !!r && typeof r === "object" && r.id != null && Number.isFinite(r.startedAt) && Number.isFinite(r.distance);

/** Read a backup file's text. Never throws: `{ ok, data }` or `{ ok, error }`. */
export function parseBackup(text) {
  let json;
  try {
    json = JSON.parse(String(text ?? ""));
  } catch {
    return { ok: false, error: "That file isn't a Rangely backup — it isn't readable JSON." };
  }
  if (!json || json.kind !== BACKUP_KIND) {
    return { ok: false, error: "That file isn't a Rangely backup." };
  }
  if (json.version > BACKUP_VERSION) {
    return { ok: false, error: "This backup was made by a newer Rangely. Update the app, then try again." };
  }
  const rides = Array.isArray(json.rides) ? json.rides.filter(isRide) : [];
  return {
    ok: true,
    data: {
      exportedAt: Number.isFinite(json.exportedAt) ? json.exportedAt : null,
      scooter: json.scooter && typeof json.scooter === "object" ? json.scooter : null,
      profile: json.profile && typeof json.profile === "object" ? json.profile : null,
      rides,
      skipped: (Array.isArray(json.rides) ? json.rides.length : 0) - rides.length,
    },
  };
}

/**
 * What a restore would do, without doing it — so the confirmation can say
 * "adds 14 rides" before anything is written.
 */
export function mergeBackup(current, data) {
  const have = new Set((current.rides || []).map((r) => String(r.id)));
  const added = data.rides.filter((r) => !have.has(String(r.id)));
  const rides = [...(current.rides || []), ...added].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

  const profile = { ...current.profile };
  for (const k of PROFILE_KEYS) if (data.profile && k in data.profile) profile[k] = data.profile[k];

  // The scooter's settings come back; the photo on this phone, if there is
  // one, stays.
  const scooter = data.scooter
    ? { ...current.scooter, ...data.scooter, photo: current.scooter?.photo ?? null }
    : current.scooter;

  return { rides, scooter, profile, added: added.length, total: data.rides.length };
}
