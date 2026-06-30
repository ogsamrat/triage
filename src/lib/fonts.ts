import { Fraunces, Geist, Geist_Mono } from "next/font/google";

/**
 * Display / headlines / big numerals.
 * Fraunces variable — optical sizing + the soft/wonk axes for warmth.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

/** UI / body — a clean grotesque, deliberately not Inter. */
export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

/** Labels / data / timestamps — the mono "kicker" voice. */
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const fontVariables = `${fraunces.variable} ${geist.variable} ${geistMono.variable}`;
