import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * How much of the screen the keyboard is covering.
 *
 * With Android drawing edge to edge, the window no longer shrinks when the
 * keyboard opens, so a scroll view has to make the room itself: this height
 * goes on as bottom padding, and the fields below the fold can be scrolled up
 * into view instead of sitting under the keys.
 */
export function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(show, (e) => setH(e?.endCoordinates?.height ?? 0));
    const b = Keyboard.addListener(hide, () => setH(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return h;
}
