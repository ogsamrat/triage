import type { Block } from "./types";
import { clockRange, genId, parseParts } from "./utils";

/** "YYYYMMDDTHHMMSS" (local, floating) from a floating-local ISO. */
function compactLocal(iso: string): string {
  const p = parseParts(iso);
  if (!p) return "";
  const z = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${p.y}${z(p.mo)}${z(p.d)}T${z(p.h)}${z(p.mi)}00`;
}

function localTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Build a Google Calendar "add event" URL. No OAuth — just a deep link.
 * Uses local datetimes plus &ctz so the event lands at the intended wall time.
 */
export function googleCalendarUrl(block: Block): string {
  const start = compactLocal(block.start);
  const end = compactLocal(block.end);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: block.title,
    dates: `${start}/${end}`,
    details: `Scheduled by Triage — ${clockRange(block.start, block.end)}.`,
  });
  const tz = localTimeZone();
  if (tz) params.set("ctz", tz);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Build a full VCALENDAR string for the day's plan. */
export function buildICS(blocks: Block[], calName = "Triage — Today's Plan"): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Triage//Plan//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeICS(calName)}`,
  ];
  for (const b of blocks) {
    const start = compactLocal(b.start);
    const end = compactLocal(b.end);
    if (!start || !end) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${genId("triage")}@triage.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeICS(b.title)}`,
      `DESCRIPTION:${escapeICS(`Scheduled by Triage (${b.kind}).`)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Trigger a client-side .ics download of the plan. */
export function downloadICS(blocks: Block[], filename = "triage-plan.ics"): void {
  if (typeof window === "undefined") return;
  const ics = buildICS(blocks);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
