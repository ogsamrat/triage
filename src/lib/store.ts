import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Block, RightNow, Step, Task, Theme, WorkingHours } from "./types";
import { SEED, makeSeed } from "./seed";

interface TriageState {
  tasks: Task[];
  rightNow: RightNow | null;
  schedule: Block[];
  steps: Record<string, Step[]>;
  availableHours: number | null; // "I only have N hours" — null = a full day
  workingHours: WorkingHours;
  theme: Theme;
  isSeed: boolean; // true while showing untouched demo data
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
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, done: !t.done } : t,
          ),
        })),

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
      }),
      onRehydrateStorage: () => () => {
        useTriage.getState().markHydrated();
      },
    },
  ),
);
