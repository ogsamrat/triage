"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Task } from "@/lib/types";
import {
  cn,
  deadlineLeaderLabel,
  formatDuration,
  relativeToNow,
} from "@/lib/utils";
import { Kicker, Numeral } from "./primitives";
import { CheckIcon } from "./icons";
import { statusText, typeLabel } from "./status";

function TaskRow({
  task,
  index,
  isNow,
  now,
  onToggle,
  reduce,
}: {
  task: Task;
  index: number;
  isNow: boolean;
  now: number | null;
  onToggle: () => void;
  reduce: boolean;
}) {
  const rel = now ? relativeToNow(task.deadline, now) : null;
  const done = Boolean(task.done);

  return (
    <motion.li
      layout={!reduce}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-12 items-start gap-x-4 border-b border-rule py-5"
    >
      <div className="col-span-2 sm:col-span-1">
        <Numeral
          n={index + 1}
          className={cn(
            "text-3xl sm:text-4xl",
            done ? "text-ink-soft/50" : "text-ink",
          )}
        />
      </div>

      <div className="col-span-10 sm:col-span-11 lg:col-span-7">
        <div className="flex items-baseline gap-1">
          <button
            role="checkbox"
            aria-checked={done}
            aria-label={`Mark "${task.title}" ${done ? "not done" : "done"}`}
            onClick={onToggle}
            className={cn(
              "mr-2 mt-1 grid h-[18px] w-[18px] shrink-0 translate-y-[2px] place-items-center self-start rounded-[2px] border transition-colors cursor-pointer",
              done
                ? "border-calm bg-calm text-paper"
                : "border-ink/40 hover:border-ink",
            )}
          >
            {done ? <CheckIcon width={12} height={12} /> : null}
          </button>

          <h3
            className={cn(
              "type-h2 min-w-0 break-words",
              done ? "text-ink-soft line-through decoration-1" : "text-ink",
            )}
          >
            {task.title}
          </h3>

          <span className="leader" aria-hidden />

          <span
            className={cn(
              "mono shrink-0 self-end whitespace-nowrap pb-1 text-sm",
              rel ? statusText(rel.status) : "text-ink-soft",
            )}
          >
            {deadlineLeaderLabel(task.deadline)}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-7">
          <span className="kicker">{typeLabel(task.type)}</span>
          {rel ? (
            <span className={cn("mono text-xs", statusText(rel.status))}>
              {rel.label}
            </span>
          ) : null}
          <span className="mono text-xs text-ink-soft">
            ~{formatDuration(task.estimatedMinutes)}
          </span>
          {isNow ? (
            <span className="mono text-xs font-medium text-signal">· start now</span>
          ) : null}
        </div>

        {/* Rationale, inline on small screens */}
        <p className="mt-2 font-display text-[0.95rem] italic leading-snug text-ink-soft lg:hidden pl-7">
          {task.rationale}
        </p>
      </div>

      {/* Rationale as marginalia on large screens */}
      <div className="hidden lg:block lg:col-span-4 lg:border-l lg:border-rule lg:pl-5">
        <p className="font-display text-[0.95rem] italic leading-snug text-ink-soft">
          {task.rationale}
        </p>
      </div>
    </motion.li>
  );
}

export function TriageBoard({
  tasks,
  rightNowTaskId,
  now,
  onToggleTask,
}: {
  tasks: Task[];
  rightNowTaskId?: string;
  now: number | null;
  onToggleTask: (id: string) => void;
}) {
  const reduce = useReducedMotion() ?? false;

  // Done tasks settle to the bottom; layout animates the move.
  const ordered = [...tasks].sort((a, b) => Number(a.done) - Number(b.done));
  const openCount = tasks.filter((t) => !t.done).length;

  return (
    <section aria-labelledby="triage-head" className="pt-14 sm:pt-20">
      <div className="flex items-end justify-between gap-4 pb-2">
        <span id="triage-head" className="kicker">
          — Triage · the agenda
        </span>
        <span className="kicker tabular-nums">
          {openCount} open / {tasks.length} total
        </span>
      </div>
      <div className="border-t-2 border-ink" />

      <motion.ul layout={!reduce} className="mt-2">
        {ordered.map((task, i) => (
          <TaskRow
            key={task.id}
            task={task}
            index={i}
            isNow={task.id === rightNowTaskId && !task.done}
            now={now}
            onToggle={() => onToggleTask(task.id)}
            reduce={reduce}
          />
        ))}
      </motion.ul>
    </section>
  );
}
