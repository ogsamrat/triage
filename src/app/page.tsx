"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTriage } from "@/lib/store";
import { useMounted } from "@/hooks/useMounted";
import { useNow } from "@/hooks/useNow";
import type { Step, Task, Theme } from "@/lib/types";
import {
  clockLabel,
  deadlineDateLabel,
  formatDuration,
  toFloatingISO,
} from "@/lib/utils";
import { Masthead } from "@/components/Masthead";
import { Nudges } from "@/components/Nudges";
import { BrainDump } from "@/components/BrainDump";
import { RightNowCard } from "@/components/RightNowCard";
import { TriageBoard } from "@/components/TriageBoard";
import { ThePlan } from "@/components/ThePlan";
import { Copilot } from "@/components/Copilot";
import { Button, Panel } from "@/components/primitives";

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  } catch {
    return "local";
  }
}

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error || "The request didn't land. Try again in a moment.",
    );
  }
  return data as T;
}

export default function Home() {
  const mounted = useMounted();
  const now = useNow();

  const tasks = useTriage((s) => s.tasks);
  const rightNow = useTriage((s) => s.rightNow);
  const schedule = useTriage((s) => s.schedule);
  const steps = useTriage((s) => s.steps);
  const availableHours = useTriage((s) => s.availableHours);
  const workingHours = useTriage((s) => s.workingHours);
  const hydrated = useTriage((s) => s._hydrated);
  const isSeed = useTriage((s) => s.isSeed);

  const setIngest = useTriage((s) => s.setIngest);
  const setSchedule = useTriage((s) => s.setSchedule);
  const setStepsFor = useTriage((s) => s.setStepsFor);
  const toggleTask = useTriage((s) => s.toggleTask);
  const toggleStep = useTriage((s) => s.toggleStep);
  const setAvailableHours = useTriage((s) => s.setAvailableHours);
  const setWorkingHours = useTriage((s) => s.setWorkingHours);
  const setTheme = useTriage((s) => s.setTheme);
  const reseedToNow = useTriage((s) => s.reseedToNow);
  const loadSample = useTriage((s) => s.loadSample);
  const clearAll = useTriage((s) => s.clearAll);

  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);

  // Rehydrate persisted state + theme once, after mount.
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    void useTriage.persist.rehydrate();
    try {
      let t = localStorage.getItem("triage-theme");
      if (t !== "dark" && t !== "light") {
        t =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      }
      setTheme(t as Theme);
    } catch {
      /* ignore */
    }
  }, [setTheme]);

  // Re-anchor untouched seed data to the real "now" once hydrated.
  const reseedRef = useRef(false);
  useEffect(() => {
    if (reseedRef.current) return;
    if (hydrated && isSeed) {
      reseedRef.current = true;
      reseedToNow(Date.now());
    }
  }, [hydrated, isSeed, reseedToNow]);

  const runSchedule = useCallback(
    async (tasksArg?: Task[]) => {
      const state = useTriage.getState();
      const open = (tasksArg ?? state.tasks).filter((t) => !t.done);
      if (open.length === 0) {
        setSchedule([]);
        return;
      }
      setScheduleLoading(true);
      setScheduleError(null);
      try {
        const { blocks } = await postJSON<{ blocks: typeof state.schedule }>(
          "/api/schedule",
          {
            tasks: tasksArg ?? state.tasks,
            now: toFloatingISO(new Date()),
            availableHours: state.availableHours,
            workingHours: state.workingHours,
          },
        );
        setSchedule(blocks);
      } catch (e) {
        setScheduleError(e instanceof Error ? e.message : "Couldn't draw up the plan.");
      } finally {
        setScheduleLoading(false);
      }
    },
    [setSchedule],
  );

  const handleIngest = useCallback(
    async (text: string) => {
      setIngestLoading(true);
      setIngestError(null);
      try {
        const result = await postJSON<{ tasks: Task[]; rightNow: Parameters<typeof setIngest>[1] }>(
          "/api/ingest",
          {
            text,
            now: toFloatingISO(new Date()),
            timezone: browserTimezone(),
          },
        );
        if (!result.tasks || result.tasks.length === 0) {
          setIngestError("I couldn't find any real tasks in that. Try a bit more detail.");
          return;
        }
        setIngest(result.tasks, result.rightNow);
        // Auto-draft the plan so the arc completes in one move.
        void runSchedule(result.tasks);
      } catch (e) {
        setIngestError(e instanceof Error ? e.message : "The triage stalled. Try again.");
      } finally {
        setIngestLoading(false);
      }
    },
    [setIngest, runSchedule],
  );

  const rightNowTask = rightNow
    ? tasks.find((t) => t.id === rightNow.taskId)
    : undefined;

  const handleBreakdown = useCallback(async () => {
    if (!rightNow || !rightNowTask) return;
    setBreakdownLoading(true);
    setBreakdownError(null);
    try {
      const { steps: newSteps } = await postJSON<{ steps: Step[] }>(
        "/api/breakdown",
        { task: rightNowTask },
      );
      setStepsFor(rightNowTask.id, newSteps);
    } catch (e) {
      setBreakdownError(e instanceof Error ? e.message : "Couldn't break it down.");
    } finally {
      setBreakdownLoading(false);
    }
  }, [rightNow, rightNowTask, setStepsFor]);

  const rnSteps = rightNow ? steps[rightNow.taskId] ?? [] : [];

  const copilotContext = tasks
    .map(
      (t, i) =>
        `${i + 1}. ${t.title} — ${t.type}, due ${deadlineDateLabel(t.deadline)} ${clockLabel(
          t.deadline,
        )}, importance ${t.importance}/5, ~${formatDuration(t.estimatedMinutes)}${
          t.done ? " (done)" : ""
        }`,
    )
    .join("\n");

  const hasTasks = tasks.length > 0;

  return (
    <main className="mx-auto max-w-[1180px] px-5 pb-24 sm:px-8">
      <Masthead />

      {mounted ? (
        <Nudges
          tasks={tasks}
          schedule={schedule}
          workingHours={workingHours}
          now={now}
        />
      ) : null}

      <BrainDump
        loading={ingestLoading}
        error={ingestError}
        onIngest={handleIngest}
      />

      {hasTasks && rightNow && rightNowTask ? (
        <RightNowCard
          rightNow={rightNow}
          task={rightNowTask}
          steps={rnSteps}
          now={now}
          breakingDown={breakdownLoading}
          breakdownError={breakdownError}
          onBreakdown={handleBreakdown}
          onToggleStep={(stepId) => toggleStep(rightNowTask.id, stepId)}
        />
      ) : null}

      {hasTasks ? (
        <TriageBoard
          tasks={tasks}
          rightNowTaskId={rightNow?.taskId}
          now={now}
          onToggleTask={toggleTask}
        />
      ) : (
        <section className="pt-14 sm:pt-20">
          <div className="border-t-2 border-ink" />
          <Panel inset className="mt-6 px-6 py-16 text-center">
            <p className="type-h2">Nothing logged yet.</p>
            <p className="measure mx-auto mt-3 text-ink-soft">
              Tell me what&rsquo;s keeping you up — type or speak it above, and
              I&rsquo;ll sort the panic into a plan.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => loadSample(Date.now())}>
                Load the sample
              </Button>
            </div>
          </Panel>
        </section>
      )}

      {hasTasks ? (
        <ThePlan
          schedule={schedule}
          availableHours={availableHours}
          workingHours={workingHours}
          now={now}
          loading={scheduleLoading}
          error={scheduleError}
          onReplan={() => runSchedule()}
          onSetAvailableHours={setAvailableHours}
          onSetWorkingHours={setWorkingHours}
        />
      ) : null}

      {hasTasks ? <Copilot context={copilotContext} /> : null}

      {/* Colophon */}
      <footer className="mt-20">
        <div className="border-t-2 border-ink" />
        <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="mono text-xs text-ink-soft">
            Triage — panic, then plan, then motion. No account, no database; your
            list lives in this browser.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => loadSample(Date.now())}
              className="mono text-xs uppercase tracking-[0.08em] text-ink-soft underline-offset-4 hover:text-ink hover:underline cursor-pointer"
            >
              Reset to sample
            </button>
            <button
              onClick={() => clearAll()}
              className="mono text-xs uppercase tracking-[0.08em] text-ink-soft underline-offset-4 hover:text-signal hover:underline cursor-pointer"
            >
              Clear board
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
