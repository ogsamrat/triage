"use client";

import { useEffect, useState } from "react";

/** True after first client render — gate anything that must not run during SSR. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
