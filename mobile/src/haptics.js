import * as Haptics from "expo-haptics";

/**
 * Haptics, with nothing allowed to throw.
 *
 * Every state change that matters is felt as well as seen — starting, pausing,
 * the ticks while holding to finish, and the save — because motion alone is
 * the one signal a rider with their eyes on the road cannot receive. On a
 * phone without a vibration motor, or on the web, these are silent no-ops.
 */
const safe = (fn) => () => {
  try {
    fn()?.catch?.(() => {});
  } catch {
    /* no haptics here */
  }
};

export const haptic = {
  tap: safe(() => Haptics.selectionAsync()),
  light: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
