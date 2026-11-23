"use client";

import { useSyncExternalStore } from "react";
import { isMuted, setMuted, subscribeSound } from "@/lib/dialup-sound";

/** Modem-sound preference. Renders as "on" on the server and during hydration. */
export function useSoundEnabled(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    subscribeSound,
    () => !isMuted(),
    () => true,
  );
  return [on, (next) => setMuted(!next)];
}
