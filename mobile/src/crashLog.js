import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The last thing that went wrong, kept on the phone.
 *
 * A beta build is tested outside, far from the laptop and its logs, so when
 * something breaks the app writes the error down and shows it next time in
 * the Scooter tab — something to screenshot and send, instead of "it
 * crashed somewhere near the park".
 */
const KEY = "rangely.lastError.v1";

export async function recordError(error, fatal = false) {
  try {
    const entry = {
      at: Date.now(),
      fatal: !!fatal,
      message: String(error?.message ?? error ?? "Unknown error").slice(0, 500),
      stack: String(error?.stack ?? "").split("\n").slice(0, 10).join("\n"),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    /* nowhere left to write it */
  }
}

export async function lastError() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearError() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* already clear */
  }
}

/** Catch errors that escape everything else, note them, then let React
 *  Native handle them as it would have. Installed once, at start-up. */
export function installCrashLog() {
  const EU = globalThis.ErrorUtils;
  if (!EU?.getGlobalHandler || EU.__rangely) return;
  const previous = EU.getGlobalHandler();
  EU.setGlobalHandler((error, isFatal) => {
    recordError(error, isFatal);
    previous?.(error, isFatal);
  });
  EU.__rangely = true;
}
