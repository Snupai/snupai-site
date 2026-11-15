"use client";

import { useSyncExternalStore } from "react";
import { BACKGROUNDS } from "~/components/backgrounds";
import { backgroundForDate } from "~/lib/seasonalBackground";

const noSubscribe = () => () => undefined;

/**
 * Picks the background from the visitor's local date. The server can't know
 * that date, so it renders nothing (the server snapshot is `null`) and the
 * season is chosen on the client after hydration, avoiding a mismatch.
 */
export default function DynamicBackground() {
  const key = useSyncExternalStore(
    noSubscribe,
    () => backgroundForDate(new Date()),
    () => null,
  );
  return key ? BACKGROUNDS[key]() : null;
}
