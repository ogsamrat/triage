import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Block,
  CommandAction,
  FocusPrefs,
  History,
  RightNow,
  Step,
  Task,
  TaskType,
  Theme,
  WorkingHours,
} from "./types";
import { SEED, makeSeed } from "./seed";
import { clamp, dateKey, genId, toFloating } from "./utils";

interface TriageState {
  tasks: Task[];
  rightNow: RightNow | null;
  schedule: Block[];
  steps: Record<string, Step[]>;
  availableHours: number | null; // "I only have N hours" — null = a full day
  workingHours: WorkingHours;
  theme: Theme;
  isSeed: boolean; // true while showing untouched demo data
  history: History; // date -> completions, for the streak
  focusTaskId: string | null; // task the Focus overlay targets
  focusPrefs: FocusPrefs;
  _hydrated: boolean;

  // ingest
  setIngest: (tasks: Task[], rightNow: RightNow) => void;
  // schedule
  setSchedule: (blocks: Block[]) => void;
  // breakdown
  setStepsFor: (taskId: string, steps: Step[]) => void;
  toggleStep: (taskId: string, stepId: string) => void;
  // tasks
  toggleTask: (taskId: string) => void;
  // conversational edits
  applyActions: (actions: CommandAction[], nowMs: number) => void;
  // focus mode
  setFocusTask: (taskId: string | null) => void;
  setFocusPrefs: (prefs: Partial<FocusPrefs>) => void;
  // prefs
  setAvailableHours: (n: number | null) => void;
  setWorkingHours: (wh: WorkingHours) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  // lifecycle
  reseedToNow: (nowMs: number) => void;
  loadSample: (nowMs: number) => void;
  clearAll: () => void;
  markHydrated: () => void;
}

export const useTriage = create<TriageState>()(
  persist(
    (set, get) => ({
      tasks: SEED.tasks,
      rightNow: SEED.rightNow,
      schedule: SEED.schedule,
      steps: SEED.steps,
      availableHours: null,
      workingHours: { start: "09:00", end: "21:00" },
      theme: "light",
      isSeed: true,
      history: {},
      focusTaskId: null,
      focusPrefs: { focusMinutes: 25, breakMinutes: 5 },
      _hydrated: false,

      setIngest: (tasks, rightNow) =>
        set({ tasks, rightNow, schedule: [], steps: {}, isSeed: false }),

      setSchedule: (blocks) => set({ schedule: blocks }),

      setStepsFor: (taskId, steps) =>
        set((s) => ({ steps: { ...s.steps, [taskId]: steps } })),

      toggleStep: (taskId, stepId) =>
        set((s) => {
          const list = s.steps[taskId];
          if (!list) return {};
          return {
            steps: {
              ...s.steps,
              [taskId]: list.map((st) =>
                st.id === stepId ? { ...st, done: !st.done } : st,
              ),
            },
          };
        }),

      toggleTask: (taskId) =>
        set((s) => {
          const t = s.tasks.find((x) => x.id === taskId);
          if (!t) return {};
          const key = dateKey(Date.now());
          const delta = t.done ? -1 : 1; // toggling on counts, toggling off un-counts
          const count = Math.max(0, (s.history[key] ?? 0) + delta);
          return {
            tasks: s.tasks.map((x) =>
              x.id === taskId ? { ...x, done: !x.done } : x,
            ),
            history: { ...s.history, [key]: count },
          };
        }),

      applyActions: (actions, nowMs) =>
        set((s) => {
          let tasks = s.tasks.map((t) => ({ ...t }));
          const steps = { ...s.steps };
          let history = { ...s.history };
          let rightNow = s.rightNow;
          const key = dateKey(nowMs);
          const bump = (n: number) => {
            history = {
              ...history,
              [key]: Math.max(0, (history[key] ?? 0) + n),
            };
          };
          const KNOWN: TaskType[] = [
            "assignment",
            "exam",
            "meeting",
            "bill",
            "errand",
            "interview",
            "other",
          ];
          for (const a of actions) {
            if (a.kind === "complete" && a.taskId) {
              const t = tasks.find((x) => x.id === a.taskId);
              if (t && !t.done) {
                t.done = true;
                bump(1);
              }
            } else if (a.kind === "reopen" && a.taskId) {
              const t = tasks.find((x) => x.id === a.taskId);
              if (t && t.done) {
                t.done = false;
                bump(-1);
              }
            } else if (a.kind === "remove" && a.taskId) {
              tasks = tasks.filter((x) => x.id !== a.taskId);
              delete steps[a.taskId];
              if (rightNow?.taskId === a.taskId) {
                const next = tasks.find((x) => !x.done) ?? tasks[0];
                rightNow = next
                  ? {
                      taskId: next.id,
                      headline: "Next up",
                      why: next.rationale || "The next thing worth starting.",
                      firstStep: "Open it and take the first small step.",
                    }
                  : null;
              }
            } else if (a.kind === "reschedule" && a.taskId && a.deadline) {
              tasks = tasks.map((x) =>
                x.id === a.taskId ? { ...x, deadline: toFloating(a.deadline!) } : x,
              );
            } else if (a.kind === "add" && a.title) {
              const type = (KNOWN as string[]).includes(a.type ?? "")
                ? (a.type as TaskType)
                : "other";
              tasks.push({
                id: genId("t"),
                title: a.title.trim(),
                type,
                deadline: a.deadline ? toFloating(a.deadline) : "",
                estimatedMinutes: Math.max(5, Math.round(a.estimatedMinutes ?? 30)),
                importance: clamp(Math.round(a.importance ?? 3), 1, 5),
                urgency: clamp(Math.round(a.urgency ?? 3), 1, 5),
                priorityRank: tasks.length + 1,
                rationale: "Added from a request.",
                done: false,
              });
            }
          }
          tasks.forEach((t, i) => (t.priorityRank = i + 1));
          return { tasks, steps, history, rightNow, isSeed: false };
        }),

      setFocusTask: (taskId) => set({ focusTaskId: taskId }),
      setFocusPrefs: (prefs) =>
        set((s) => ({ focusPrefs: { ...s.focusPrefs, ...prefs } })),

      setAvailableHours: (n) => set({ availableHours: n }),
      setWorkingHours: (wh) => set({ workingHours: wh }),

      setTheme: (t) => {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("triage-theme", t);
          } catch {
            /* ignore */
          }
          document.documentElement.setAttribute("data-theme", t);
        }
        set({ theme: t });
      },

      toggleTheme: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        get().setTheme(next);
      },

      reseedToNow: (nowMs) => {
        if (!get().isSeed) return;
        const s = makeSeed(nowMs);
        set({
          tasks: s.tasks,
          rightNow: s.rightNow,
          schedule: s.schedule,
          steps: s.steps,
          isSeed: true,
        });
      },

      loadSample: (nowMs) => {
        const s = makeSeed(nowMs);
        set({
          tasks: s.tasks,
          rightNow: s.rightNow,
          schedule: s.schedule,
          steps: s.steps,
          isSeed: true,
        });
      },

      clearAll: () =>
        set({
          tasks: [],
          rightNow: null,
          schedule: [],
          steps: {},
          isSeed: false,
        }),

      markHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: "triage-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // First client render must match SSR (the SEED defaults). We rehydrate
      // manually after mount, then re-anchor the seed to "now".
      skipHydration: true,
      // Theme is mirrored to a flat key for the pre-paint script; don't persist
      // transient flags.
      partialize: (s) => ({
        tasks: s.tasks,
        rightNow: s.rightNow,
        schedule: s.schedule,
        steps: s.steps,
        availableHours: s.availableHours,
        workingHours: s.workingHours,
        isSeed: s.isSeed,
        history: s.history,
        focusPrefs: s.focusPrefs,
      }),
      onRehydrateStorage: () => () => {
        useTriage.getState().markHydrated();
      },
    },
  ),
);
