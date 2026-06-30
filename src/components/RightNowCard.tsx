"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { RightNow, Step, Task } from "@/lib/types";
import {
  cn,
  deadlineLeaderLabel,
  formatDuration,
  relativeToNow,
  totalMinutes,
} from "@/lib/utils";
import { useSpeak } from "@/hooks/useSpeak";
import { Button, Kicker } from "./primitives";
import { ArrowDownIcon, CheckIcon, PlayIcon, SparkIcon, StopIcon } from "./icons";
import { statusText } from "./status";

export function RightNowCard({
  rightNow,
  task,
  steps,
  now,
  breakingDown,
  breakdownError,
  onBreakdown,
  onToggleStep,
}: {
  rightNow: RightNow;
  task: Task | undefined;
  steps: Step[];
  now: number | null;
  breakingDown: boolean;
  breakdownError: string | null;
  onBreakdown: () => void;
  onToggleStep: (stepId: string) => void;
}) {
  const reduce = useReducedMotion();
  const { supported: ttsOk, speaking, speak, stop } = useSpeak();

  const rel = task && now ? relativeToNow(task.deadline, now) : null;
  const hasSteps = steps.length > 0;
  const doneCount = steps.filter((s) => s.done).length;

  const readAloud = () => {
    if (speaking) {
      stop();
      return;
    }
    speak(
      `${rightNow.headline}. ${rightNow.why} First step: ${rightNow.firstStep}`,
    );
  };

  return (
    <section aria-labelledby="rightnow-head" className="pt-14 sm:pt-20">
      <div className="flex items-end justify-between gap-4 pb-2">
        <Kicker>Right now</Kicker>
        <span className="kicker">The one thing</span>
      </div>
      <div className="border-t-2 border-ink" />

      <div
        className={cn(
          "attention mt-6 rounded-[3px] border border-ink bg-paper-2",
          "px-6 py-7 sm:px-9 sm:py-10",
        )}
      >
        <div className="grid grid-cols-12 gap-x-6 gap-y-8">
          {/* Left: the pitch */}
          <div className="col-span-12 lg:col-span-7">
            <h2 id="rightnow-head" className="type-h1">
              {rightNow.headline}
            </h2>

            {task ? (
              <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-lg text-ink-soft">
                  {task.title}
                </span>
                {rel ? (
                  <span className={cn("mono text-xs", statusText(rel.status))}>
                    {deadlineLeaderLabel(task.deadline)} · {rel.label}
                  </span>
                ) : (
                  <span className="mono text-xs text-ink-soft">
                    {deadlineLeaderLabel(task.deadline)}
                  </span>
                )}
              </div>
            ) : null}

            <p className="measure mt-5 text-lg leading-relaxed">{rightNow.why}</p>

            <div className="mt-6 border-l-2 border-signal pl-4">
              <Kicker>First step</Kicker>
              <p className="mt-1.5 text-base text-ink">{rightNow.firstStep}</p>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button
                variant="solid"
                size="lg"
                onClick={onBreakdown}
                disabled={breakingDown}
              >
                <SparkIcon width={16} height={16} />
                {breakingDown
                  ? "Breaking it down…"
                  : hasSteps
                    ? "Re-break it down"
                    : "Break it down"}
              </Button>
              {ttsOk ? (
                <Button variant="outline" size="lg" onClick={readAloud}>
                  {speaking ? (
                    <StopIcon width={15} height={15} />
                  ) : (
                    <PlayIcon width={15} height={15} />
                  )}
                  {speaking ? "Stop" : "Read aloud"}
                </Button>
              ) : null}
            </div>
            {breakdownError ? (
              <p className="mt-3 text-sm text-signal" role="alert">
                {breakdownError}
              </p>
            ) : null}
          </div>

          {/* Right: the checklist */}
          <div className="col-span-12 lg:col-span-5 lg:border-l lg:border-rule lg:pl-6">
            <div className="flex items-end justify-between pb-2">
              <Kicker>The checklist</Kicker>
              {hasSteps ? (
                <span className="mono text-xs text-ink-soft tabular-nums">
                  {doneCount}/{steps.length} · {formatDuration(totalMinutes(steps))}
                </span>
              ) : null}
            </div>

            {breakingDown && !hasSteps ? (
              <ul className="space-y-3" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="h-5 w-5 rounded-[2px] skeleton" />
                    <span className="h-3 flex-1 rounded skeleton" />
                  </li>
                ))}
              </ul>
            ) : hasSteps ? (
              <ul className="space-y-1">
                <AnimatePresence initial={false}>
                  {steps.map((s, i) => (
                    <motion.li
                      key={s.id}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.04 }}
                      className="group flex items-start gap-3 border-b border-rule py-2.5 last:border-0"
                    >
                      <button
                        role="checkbox"
                        aria-checked={Boolean(s.done)}
                        aria-label={`Mark "${s.label}" ${s.done ? "incomplete" : "complete"}`}
                        onClick={() => onToggleStep(s.id)}
                        className={cn(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[2px] border transition-colors cursor-pointer",
                          s.done
                            ? "border-calm bg-calm text-paper"
                            : "border-ink/50 hover:border-ink",
                        )}
                      >
                        {s.done ? <CheckIcon width={13} height={13} /> : null}
                      </button>
                      <span
                        className={cn(
                          "flex-1 text-sm leading-snug",
                          s.done ? "text-ink-soft line-through" : "text-ink",
                        )}
                      >
                        {s.label}
                      </span>
                      <span className="mono shrink-0 text-xs text-ink-soft tabular-nums">
                        {s.minutes}m
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ) : (
              <div className="flex items-start gap-3 py-2 text-sm text-ink-soft">
                <ArrowDownIcon width={16} height={16} className="mt-0.5 shrink-0" />
                <p>
                  Frozen at the start? Hit <em className="italic">Break it down</em>{" "}
                  and Triage slices this into 20-minute moves you can actually
                  begin.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
