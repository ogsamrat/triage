"use client";

import type { Block, WorkingHours } from "@/lib/types";
import {
  cn,
  clockLabel,
  clockRange,
  floatingToMs,
  formatDuration,
} from "@/lib/utils";
import { downloadICS, googleCalendarUrl } from "@/lib/calendar";
import { Button, IconButton, Kicker, Panel, controlClasses } from "./primitives";
import {
  CalendarIcon,
  DownloadIcon,
  FocusIcon,
  MinusIcon,
  PlusIcon,
  RefreshIcon,
  SparkIcon,
} from "./icons";
import { blockAccent, blockKindLabel } from "./status";
import { ShareButton } from "./ShareButton";

function blockMinutes(b: Block): number {
  const ms = floatingToMs(b.end) - floatingToMs(b.start);
  return Number.isNaN(ms) ? 0 : Math.max(0, Math.round(ms / 60000));
}

export function ThePlan({
  schedule,
  availableHours,
  workingHours,
  now,
  loading,
  error,
  onReplan,
  onSetAvailableHours,
  onSetWorkingHours,
  onFocusTask,
  shareHeadline,
  taskCount,
  streak,
}: {
  schedule: Block[];
  availableHours: number | null;
  workingHours: WorkingHours;
  now: number | null;
  loading: boolean;
  error: string | null;
  onReplan: () => void;
  onSetAvailableHours: (n: number | null) => void;
  onSetWorkingHours: (wh: WorkingHours) => void;
  onFocusTask: (taskId: string) => void;
  shareHeadline: string;
  taskCount: number;
  streak: number;
}) {
  const focusMin = schedule
    .filter((b) => b.kind === "focus")
    .reduce((a, b) => a + blockMinutes(b), 0);

  const inc = () =>
    onSetAvailableHours(availableHours == null ? 2 : Math.min(12, availableHours + 1));
  const dec = () =>
    onSetAvailableHours(
      availableHours == null ? null : availableHours <= 1 ? null : availableHours - 1,
    );

  return (
    <section aria-labelledby="plan-head" className="pt-14 sm:pt-20">
      <div className="flex items-end justify-between gap-4 pb-2">
        <span id="plan-head" className="kicker">
          — The plan
        </span>
        <span className="kicker tabular-nums">
          {schedule.length
            ? `${formatDuration(focusMin)} of focus`
            : "Not drawn up"}
        </span>
      </div>
      <div className="border-t-2 border-ink" />

      {/* Controls */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex items-center gap-3">
          <span className="kicker">Today I have</span>
          <div className="flex items-center rounded-[2px] border border-rule">
            <IconButton
              label="Fewer hours"
              onClick={dec}
              className="h-8 w-8 border-0"
            >
              <MinusIcon width={15} height={15} />
            </IconButton>
            <span className="mono w-[4.5rem] text-center text-sm tabular-nums">
              {availableHours == null ? "Full day" : `${availableHours} hr`}
            </span>
            <IconButton
              label="More hours"
              onClick={inc}
              className="h-8 w-8 border-0"
            >
              <PlusIcon width={15} height={15} />
            </IconButton>
          </div>
        </div>

        <label className="flex items-center gap-2">
          <span className="kicker">Hours</span>
          <input
            type="time"
            value={workingHours.start}
            onChange={(e) =>
              onSetWorkingHours({ ...workingHours, start: e.target.value })
            }
            aria-label="Working hours start"
            className="mono rounded-[2px] border border-rule bg-paper-2 px-2 py-1 text-sm text-ink"
          />
          <span className="text-ink-soft">–</span>
          <input
            type="time"
            value={workingHours.end}
            onChange={(e) =>
              onSetWorkingHours({ ...workingHours, end: e.target.value })
            }
            aria-label="Working hours end"
            className="mono rounded-[2px] border border-rule bg-paper-2 px-2 py-1 text-sm text-ink"
          />
        </label>

        <div className="ml-auto flex items-center gap-3">
          {schedule.length ? (
            <ShareButton
              headline={shareHeadline}
              focus={formatDuration(focusMin)}
              tasks={taskCount}
              streak={streak}
            />
          ) : null}
          {schedule.length ? (
            <button
              className={controlClasses("outline", "md")}
              onClick={() => downloadICS(schedule)}
            >
              <DownloadIcon width={15} height={15} />
              Download .ics
            </button>
          ) : null}
          <Button variant="solid" size="md" onClick={onReplan} disabled={loading}>
            {schedule.length ? (
              <RefreshIcon width={15} height={15} />
            ) : (
              <SparkIcon width={15} height={15} />
            )}
            {loading
              ? "Planning…"
              : schedule.length
                ? "Re-plan"
                : "Build the plan"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-signal" role="alert">
          {error}
        </p>
      ) : null}

      {/* Timetable */}
      <div className="mt-6">
        {loading && schedule.length === 0 ? (
          <ul aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className="grid grid-cols-12 gap-x-4 border-b border-rule py-5"
              >
                <span className="col-span-3 h-4 skeleton sm:col-span-2" />
                <span className="col-span-9 h-4 skeleton sm:col-span-10" />
              </li>
            ))}
          </ul>
        ) : schedule.length === 0 ? (
          <Panel inset className="px-6 py-10 text-center">
            <p className="font-display text-xl text-ink-soft">
              No plan drawn up yet.
            </p>
            <p className="mono mt-2 text-xs text-ink-soft">
              Build one and Triage lays your tasks into protected, deadline-aware
              time blocks.
            </p>
          </Panel>
        ) : (
          <ul>
            {schedule.map((b) => {
              const startMs = floatingToMs(b.start);
              const endMs = floatingToMs(b.end);
              const current =
                now != null && now >= startMs && now < endMs;
              const isBreakish = b.kind === "break" || b.kind === "buffer";
              return (
                <li
                  key={b.id}
                  className={cn(
                    "grid grid-cols-12 items-stretch gap-x-4 border-b border-rule py-4",
                    current && "bg-paper-2",
                  )}
                >
                  <div className="col-span-3 pt-0.5 sm:col-span-2">
                    <span className="mono text-sm tabular-nums text-ink">
                      {clockLabel(b.start)}
                    </span>
                    {current ? (
                      <span className="mono mt-0.5 block text-[0.65rem] uppercase tracking-[0.12em] text-signal">
                        Now
                      </span>
                    ) : null}
                  </div>

                  <div className="col-span-9 flex items-stretch gap-4 sm:col-span-10">
                    <span
                      className={cn(
                        "w-[3px] shrink-0 rounded-full",
                        blockAccent(b.kind),
                      )}
                      aria-hidden
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h4
                          className={cn(
                            "font-display text-lg leading-snug",
                            isBreakish ? "text-ink-soft" : "text-ink",
                          )}
                        >
                          {b.title}
                        </h4>
                        <span className="mono shrink-0 text-xs tabular-nums text-ink-soft">
                          {clockRange(b.start, b.end)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="kicker">{blockKindLabel(b.kind)}</span>
                        <span className="mono text-xs text-ink-soft tabular-nums">
                          {formatDuration(blockMinutes(b))}
                        </span>
                        <a
                          href={googleCalendarUrl(b)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={controlClasses("ghost", "sm")}
                        >
                          <CalendarIcon width={14} height={14} />
                          Add to Google Calendar
                        </a>
                        {b.taskId && !isBreakish ? (
                          <button
                            className={controlClasses("ghost", "sm")}
                            onClick={() => onFocusTask(b.taskId)}
                          >
                            <FocusIcon width={14} height={14} />
                            Focus
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
