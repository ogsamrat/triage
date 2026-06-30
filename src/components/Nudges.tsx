"use client";

import type { Block, Task, WorkingHours } from "@/lib/types";
import { clock12, floatingToMs, formatDuration, relativeToNow } from "@/lib/utils";

function workEndMs(now: number, wh: WorkingHours): number {
  const [h, m] = (wh.end || "21:00").split(":").map(Number);
  const d = new Date(now);
  d.setHours(h || 21, m || 0, 0, 0);
  return d.getTime();
}

function clockFromMs(ms: number): string {
  const d = new Date(ms);
  return clock12(d.getHours(), d.getMinutes());
}

function buildNudges(
  tasks: Task[],
  schedule: Block[],
  workingHours: WorkingHours,
  now: number,
): string[] {
  const out: string[] = [];
  const open = tasks.filter((t) => !t.done);

  // 1. Overdue
  const overdue = open
    .filter((t) => {
      const ms = floatingToMs(t.deadline);
      return !Number.isNaN(ms) && ms < now;
    })
    .sort((a, b) => floatingToMs(a.deadline) - floatingToMs(b.deadline));
  if (overdue[0]) {
    out.push(`${overdue[0].title} is overdue — pull it back into today before it festers.`);
  }

  // 2. Due soon but not on the plan
  const scheduled = new Set(schedule.map((b) => b.taskId));
  const soonUnscheduled = open
    .filter((t) => {
      const diff = floatingToMs(t.deadline) - now;
      return diff > 0 && diff < 24 * 3600_000 && !scheduled.has(t.id);
    })
    .sort((a, b) => floatingToMs(a.deadline) - floatingToMs(b.deadline))[0];
  if (soonUnscheduled) {
    const rel = relativeToNow(soonUnscheduled.deadline, now);
    out.push(
      `${soonUnscheduled.title} is due ${rel.label} and isn't on the plan. Slot it now.`,
    );
  }

  // 3. The next protectable gap in today's plan
  if (schedule.length && open.length) {
    const future = [...schedule]
      .map((b) => ({ s: floatingToMs(b.start), e: floatingToMs(b.end) }))
      .filter((b) => !Number.isNaN(b.s) && !Number.isNaN(b.e))
      .sort((a, b) => a.s - b.s);
    let cursor = now;
    let gap: { start: number; mins: number } | null = null;
    for (const b of future) {
      if (b.s - cursor >= 45 * 60_000) {
        gap = { start: cursor, mins: Math.round((b.s - cursor) / 60_000) };
        break;
      }
      cursor = Math.max(cursor, b.e);
    }
    if (!gap) {
      const end = workEndMs(now, workingHours);
      if (end - cursor >= 60 * 60_000) {
        gap = { start: cursor, mins: Math.round((end - cursor) / 60_000) };
      }
    }
    if (gap) {
      const top = open[0];
      out.push(
        `A ${formatDuration(gap.mins)} gap opens at ${clockFromMs(gap.start)} — guard it for ${top.title}.`,
      );
    }
  }

  return out.slice(0, 2);
}

export function Nudges({
  tasks,
  schedule,
  workingHours,
  now,
}: {
  tasks: Task[];
  schedule: Block[];
  workingHours: WorkingHours;
  now: number | null;
}) {
  if (now == null) return null;
  const nudges = buildNudges(tasks, schedule, workingHours, now);
  if (nudges.length === 0) return null;

  return (
    <div className="border-b border-rule py-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
        <span className="kicker shrink-0 text-signal">— Nudge</span>
        <ul className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6">
          {nudges.map((n, i) => (
            <li key={i} className="text-sm leading-snug text-ink">
              {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
