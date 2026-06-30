/**
 * Small, dependency-free helpers. Date formatting is intentionally derived from
 * the ISO *string components* (not the runtime timezone) so server and client
 * render identical text — no hydration mismatches. We treat all stored
 * datetimes as "floating local" ("YYYY-MM-DDTHH:MM:SS", no Z / offset).
 */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

let _idc = 0;
export function genId(prefix = "id"): string {
  _idc += 1;
  return `${prefix}_${Date.now().toString(36)}_${_idc}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface DateParts {
  y: number;
  mo: number; // 1-12
  d: number;
  h: number;
  mi: number;
}

export function parseParts(iso: string | undefined | null): DateParts | null {
  if (!iso) return null;
  const m = /(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{1,2}))?/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = m[4] === undefined ? 0 : Number(m[4]);
  const mi = m[5] === undefined ? 0 : Number(m[5]);
  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) return null;
  return { y, mo, d, h, mi };
}

/** Deterministic weekday index (0=Sun) via UTC math — timezone-independent. */
function weekdayIndex(p: DateParts): number {
  return new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function clock12(h: number, mi: number): string {
  const ampm = h < 12 ? "am" : "pm";
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return mi === 0 ? `${hr}${ampm}` : `${hr}:${pad2(mi)}${ampm}`;
}

/** "2:00pm" from an ISO. */
export function clockLabel(iso: string): string {
  const p = parseParts(iso);
  if (!p) return "—";
  return clock12(p.h, p.mi);
}

/** "Fri · 11:59pm" — the deterministic deadline label for dotted leaders. */
export function deadlineLeaderLabel(iso: string): string {
  const p = parseParts(iso);
  if (!p) return "—";
  return `${WEEKDAYS_SHORT[weekdayIndex(p)]} ${clock12(p.h, p.mi)}`;
}

/** "Fri 3 Jul" — secondary date label. */
export function deadlineDateLabel(iso: string): string {
  const p = parseParts(iso);
  if (!p) return "—";
  return `${WEEKDAYS_SHORT[weekdayIndex(p)]} ${p.d} ${MONTHS_SHORT[p.mo - 1]}`;
}

/** "2 – 3:30pm" range. Keeps the start meridiem when the block straddles noon
 *  (e.g. "11:20am – 12:50pm"); drops it only when both ends share a half-day. */
export function clockRange(startIso: string, endIso: string): string {
  const a = parseParts(startIso);
  const b = parseParts(endIso);
  if (!a || !b) return "—";
  const left = clock12(a.h, a.mi);
  const right = clock12(b.h, b.mi);
  const sameHalf = a.h < 12 === b.h < 12;
  return sameHalf ? `${left.replace(/(am|pm)$/, "")} – ${right}` : `${left} – ${right}`;
}

/** "Tuesday, June 30, 2026" — masthead issue date (uses local Date components). */
export function issueDate(ms: number): string {
  const dt = new Date(ms);
  return `${WEEKDAYS_LONG[dt.getDay()]}, ${MONTHS_LONG[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

/** Convert a Date into a floating-local ISO string. */
export function toFloatingISO(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;
}

/** Milliseconds for a floating-local ISO, interpreted in the local timezone. */
export function floatingToMs(iso: string): number {
  const p = parseParts(iso);
  if (!p) return NaN;
  return new Date(p.y, p.mo - 1, p.d, p.h, p.mi, 0).getTime();
}

export type DeadlineStatus = "overdue" | "soon" | "upcoming" | "later";

export interface RelativeDeadline {
  status: DeadlineStatus;
  label: string;
}

/** Now-relative status + label. Call only after mount (depends on wall clock). */
export function relativeToNow(iso: string, nowMs: number): RelativeDeadline {
  const ms = floatingToMs(iso);
  if (Number.isNaN(ms)) return { status: "later", label: "—" };
  const diff = ms - nowMs;
  const mins = Math.round(diff / 60000);
  if (diff <= 0) {
    const overdueMin = -mins;
    if (overdueMin < 60) return { status: "overdue", label: "overdue" };
    if (overdueMin < 60 * 24)
      return { status: "overdue", label: `${Math.round(overdueMin / 60)}h late` };
    return { status: "overdue", label: `${Math.round(overdueMin / 1440)}d late` };
  }
  let label: string;
  if (mins < 60) label = `in ${Math.max(1, mins)}m`;
  else if (mins < 60 * 24) label = `in ${Math.round(mins / 60)}h`;
  else if (mins < 60 * 24 * 7) label = `in ${Math.round(mins / 1440)}d`;
  else label = `in ${Math.round(mins / (1440 * 7))}w`;

  let status: DeadlineStatus = "later";
  if (diff < 1000 * 60 * 60 * 24) status = "soon";
  else if (diff < 1000 * 60 * 60 * 72) status = "upcoming";
  return { status, label };
}

export function totalMinutes(steps: { minutes: number }[]): number {
  return steps.reduce((acc, s) => acc + (Number(s.minutes) || 0), 0);
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
