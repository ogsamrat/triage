"use client";

import { useTriage } from "@/lib/store";
import { useMounted } from "@/hooks/useMounted";
import { IconButton } from "./primitives";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle() {
  const theme = useTriage((s) => s.theme);
  const toggleTheme = useTriage((s) => s.toggleTheme);
  const mounted = useMounted();
  const isDark = mounted && theme === "dark";

  return (
    <IconButton
      label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}
