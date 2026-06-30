"use client";

import { useEffect, useState } from "react";

/**
 * Wall-clock time in ms, or null until mounted. Returning null pre-mount keeps
 * time-relative UI deterministic during SSR (render a stable fallback until set).
 * Ticks every minute so "due soon" / nudges stay live.
 */
export function useNow(tickMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
}
