/**
 * Minimal .ics parser: pulls SUMMARY + a date out of each VEVENT/VTODO and
 * builds a plain-text list the ingest endpoint can triage. No external deps.
 */

function formatIcsDate(v: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(v.trim());
  if (!m) return "";
  const [, y, mo, d, h, mi] = m;
  return h !== undefined ? `on ${y}-${mo}-${d} ${h}:${mi}` : `due ${y}-${mo}-${d}`;
}

function unescape(v: string): string {
  // Single pass so an escaped backslash is consumed before newline detection.
  return v.replace(/\\([\\;,nN])/g, (_, c) => (c === "n" || c === "N" ? " " : c)).trim();
}

export function icsToText(ics: string): string {
  // Unfold: continuation lines begin with a space or tab.
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const items: string[] = [];
  let inItem = false;
  let summary = "";
  let when = "";

  for (const line of lines) {
    if (/^BEGIN:(VEVENT|VTODO)/i.test(line)) {
      inItem = true;
      summary = "";
      when = "";
      continue;
    }
    if (/^END:(VEVENT|VTODO)/i.test(line)) {
      if (summary) items.push(when ? `${summary} (${when})` : summary);
      inItem = false;
      continue;
    }
    if (!inItem) continue;

    const m = /^([A-Z-]+)(;[^:]*)?:(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toUpperCase();
    const val = m[3] ?? "";
    if (key === "SUMMARY") summary = unescape(val);
    else if ((key === "DUE" || key === "DTSTART" || key === "DTEND") && !when) {
      when = formatIcsDate(val);
    }
  }

  return items.join(", ");
}
