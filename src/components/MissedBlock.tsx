"use client";

import type { Block, Task } from "@/lib/types";
import { clockLabel, floatingToMs } from "@/lib/utils";
import { Button } from "./primitives";
import { RefreshIcon } from "./icons";

/**
 * Detects that the day slipped: a task-bearing block has already ended, its task
 * isn't done, and there's still open work. Offers a one-tap reflow from now.
 */
export function MissedBlock({
  schedule,
  tasks,
  now,
  loading,
  onReflow,
}: {
  schedule: Block[];
  tasks: Task[];
  now: number | null;
  loading: boolean;
  onReflow: () => void;
}) {
  if (now == null || schedule.length === 0) return null;

  const doneIds = new Set(tasks.filter((t) => t.done).map((t) => t.id));
  const openCount = tasks.filter((t) => !t.done).length;
  if (openCount === 0) return null;

  const missed = schedule.filter((b) => {
    if (b.kind === "break" || b.kind === "buffer" || !b.taskId) return false;
    const end = floatingToMs(b.end);
    return Number.isFinite(end) && end < now && !doneIds.has(b.taskId);
  });
  if (missed.length === 0) return null;

  const first = missed[0];

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-[3px] border border-signal/60 bg-signal/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="kicker text-signal">— You&rsquo;re behind</span>
        <p className="text-sm text-ink">
          The {clockLabel(first.start)} block ({first.title}) slipped, and{" "}
          {missed.length > 1 ? `${missed.length} blocks are` : "it is"} still open.
          Reflow the rest of the day from now.
        </p>
      </div>
      <Button variant="solid" size="md" onClick={onReflow} disabled={loading} className="shrink-0">
        <RefreshIcon width={15} height={15} />
        {loading ? "Reflowing…" : "Reflow the day"}
      </Button>
    </div>
  );
}
