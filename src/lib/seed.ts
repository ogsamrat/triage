import type { Block, RightNow, Step, Task } from "./types";
import { genId, toFloatingISO } from "./utils";

/**
 * Seeded demo data so the app looks finished on first load. The default export
 * (SEED) uses literal floating-ISO strings so server + client render identically
 * (no hydration drift). makeSeed(nowMs) re-anchors the same scenario to the real
 * "today" after mount, so the demo always reads as current.
 *
 * Scenario (the canonical brain-dump):
 *   "calc problem set due Friday, 1500-word essay on the French Revolution
 *    Monday, call the dentist, rent due the 1st, prep for a 2pm interview Thursday."
 */

const ID = {
  essay: "essay",
  interview: "interview",
  rent: "rent",
  calc: "calc",
  dentist: "dentist",
} as const;

export interface SeedData {
  tasks: Task[];
  rightNow: RightNow;
  schedule: Block[];
  steps: Record<string, Step[]>;
}

const ESSAY_STEPS = (mk: () => string): Step[] => [
  { id: mk(), label: "Write the one-sentence argument the essay will prove.", minutes: 15, done: false },
  { id: mk(), label: "List three supporting points, one line each.", minutes: 20, done: false },
  { id: mk(), label: "Pull one primary-source quote per point.", minutes: 25, done: false },
  { id: mk(), label: "Draft the introduction (~150 words).", minutes: 25, done: false },
  { id: mk(), label: "Write the first body paragraph from your strongest point.", minutes: 30, done: false },
];

function tasks(deadlines: Record<keyof typeof ID, string>): Task[] {
  return [
    {
      id: ID.essay,
      title: "Essay on the French Revolution (1,500 words)",
      type: "assignment",
      deadline: deadlines.essay,
      estimatedMinutes: 180,
      importance: 4,
      urgency: 3,
      priorityRank: 1,
      rationale:
        "The one task that can't be done in a sitting, and the deadline only feels far away.",
      done: false,
    },
    {
      id: ID.interview,
      title: "Prep for the 2pm interview",
      type: "interview",
      deadline: deadlines.interview,
      estimatedMinutes: 90,
      importance: 5,
      urgency: 4,
      priorityRank: 2,
      rationale: "Highest stakes of the week. Two days is plenty — if you start before Thursday.",
      done: false,
    },
    {
      id: ID.rent,
      title: "Pay rent",
      type: "bill",
      deadline: deadlines.rent,
      estimatedMinutes: 5,
      importance: 5,
      urgency: 5,
      priorityRank: 3,
      rationale: "Non-negotiable and due tomorrow; a two-minute transfer that's pure downside if missed.",
      done: false,
    },
    {
      id: ID.calc,
      title: "Calculus problem set",
      type: "assignment",
      deadline: deadlines.calc,
      estimatedMinutes: 75,
      importance: 3,
      urgency: 3,
      priorityRank: 4,
      rationale: "Mechanical once you sit down; slot it after the essay has momentum.",
      done: false,
    },
    {
      id: ID.dentist,
      title: "Call the dentist",
      type: "errand",
      deadline: deadlines.dentist,
      estimatedMinutes: 10,
      importance: 2,
      urgency: 2,
      priorityRank: 5,
      rationale: "On the list for a month. Clear it on a break and bank the small win.",
      done: false,
    },
  ];
}

const RIGHT_NOW: RightNow = {
  taskId: ID.essay,
  headline: "Draft the essay's spine",
  why: "It's the only task that needs runway, and 'Monday' is a trap. Outline now while it's quiet; the words come easier once the argument exists.",
  firstStep: "Open a blank doc and write the single sentence this essay will prove.",
};

function scheduleFor(day: string, mk: () => string): Block[] {
  const at = (t: string) => `${day}T${t}:00`;
  return [
    { id: mk(), taskId: ID.rent, title: "Clear the quick wins: pay rent, ring the dentist", start: at("09:15"), end: at("09:35"), kind: "admin" },
    { id: mk(), taskId: ID.essay, title: "Essay — outline the argument, draft the intro", start: at("09:35"), end: at("11:05"), kind: "focus" },
    { id: mk(), taskId: "", title: "Break — walk, water, no screens", start: at("11:05"), end: at("11:20"), kind: "break" },
    { id: mk(), taskId: ID.interview, title: "Interview prep — research, then three STAR stories", start: at("11:20"), end: at("12:50"), kind: "focus" },
    { id: mk(), taskId: "", title: "Lunch", start: at("12:50"), end: at("13:35"), kind: "break" },
    { id: mk(), taskId: ID.calc, title: "Calculus problem set", start: at("13:35"), end: at("14:50"), kind: "focus" },
    { id: mk(), taskId: "", title: "Buffer — overflow + reset", start: at("14:50"), end: at("15:05"), kind: "buffer" },
    { id: mk(), taskId: ID.essay, title: "Essay — first two body paragraphs", start: at("15:05"), end: at("16:35"), kind: "focus" },
  ];
}

/** Fixed literal seed used for SSR + first paint (deterministic). */
let _seedBlk = 0;
let _seedStep = 0;
const fixedBlkId = () => `seed-blk-${++_seedBlk}`;
const fixedStepId = () => `seed-step-${++_seedStep}`;

export const SEED: SeedData = {
  tasks: tasks({
    essay: "2026-07-06T09:00:00",
    interview: "2026-07-02T14:00:00",
    rent: "2026-07-01T09:00:00",
    calc: "2026-07-03T23:59:00",
    dentist: "2026-07-02T17:00:00",
  }),
  rightNow: RIGHT_NOW,
  schedule: scheduleFor("2026-06-30", fixedBlkId),
  steps: { [ID.essay]: ESSAY_STEPS(fixedStepId) },
};

/** Pad to a local "YYYY-MM-DD" prefix. */
function dayPrefix(ms: number): string {
  const d = new Date(ms);
  const z = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function offsetISO(nowMs: number, addDays: number, h: number, mi: number): string {
  const d = new Date(nowMs);
  d.setDate(d.getDate() + addDays);
  d.setHours(h, mi, 0, 0);
  return toFloatingISO(d);
}

/** The same scenario, re-anchored to the real "now" (client-only, post-mount). */
export function makeSeed(nowMs: number): SeedData {
  return {
    tasks: tasks({
      essay: offsetISO(nowMs, 6, 9, 0),
      interview: offsetISO(nowMs, 2, 14, 0),
      rent: offsetISO(nowMs, 1, 9, 0),
      calc: offsetISO(nowMs, 3, 23, 59),
      dentist: offsetISO(nowMs, 2, 17, 0),
    }),
    rightNow: RIGHT_NOW,
    schedule: scheduleFor(dayPrefix(nowMs), () => genId("blk")),
    steps: { [ID.essay]: ESSAY_STEPS(() => genId("step")) },
  };
}
