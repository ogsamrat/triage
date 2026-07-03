/** Shared domain types for Triage. */

export const TASK_TYPES = [
  "assignment",
  "exam",
  "meeting",
  "bill",
  "errand",
  "interview",
  "other",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  /** Floating-local ISO, e.g. "2026-07-03T23:59:00" (no timezone designator). */
  deadline: string;
  estimatedMinutes: number;
  importance: number; // 1-5
  urgency: number; // 1-5
  priorityRank: number; // 1 = do first
  rationale: string; // one sharp editorial line
  done?: boolean;
}

export interface RightNow {
  taskId: string;
  headline: string;
  why: string;
  firstStep: string;
}

export interface Step {
  id: string;
  label: string;
  minutes: number;
  done?: boolean;
}

export type BlockKind = "focus" | "admin" | "break" | "buffer";

export interface Block {
  id: string;
  taskId: string;
  title: string;
  /** Floating-local ISO, e.g. "2026-07-03T14:00:00". */
  start: string;
  end: string;
  kind: BlockKind;
}

export interface WorkingHours {
  /** "HH:MM" 24h */
  start: string;
  end: string;
}

export type Theme = "light" | "dark";

/** Conversational-edit actions the copilot can apply to state. */
export type CommandActionKind =
  | "complete"
  | "reopen"
  | "remove"
  | "reschedule"
  | "add"
  | "replan";

export interface CommandAction {
  kind: CommandActionKind;
  taskId?: string;
  title?: string;
  type?: TaskType;
  deadline?: string;
  estimatedMinutes?: number;
  importance?: number;
  urgency?: number;
}

/** date (YYYY-MM-DD) -> number of tasks completed that day, for the streak. */
export type History = Record<string, number>;

export interface FocusPrefs {
  focusMinutes: number;
  breakMinutes: number;
}
