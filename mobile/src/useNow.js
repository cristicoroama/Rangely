import { useEffect, useState } from "react";

/** The current time, re-read every `every` ms while `active`. A clock on the
 *  ride screen, a minute tick for the dusk check on home. */
export function useNow(every = 1000, active = true) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [every, active]);
  return now;
}
