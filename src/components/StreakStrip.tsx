"use client";

import type { History } from "@/lib/types";
import { cn, currentStreak, dateKey } from "@/lib/utils";
import { Kicker } from "./primitives";

const DAY = 86_400_000;

export function StreakStrip({
  history,
  now,
}: {
  history: History;
  now: number | null;
}) {
  if (now == null) return null;

  const days = 14;
  const cells = Array.from({ length: days }, (_, i) => {
    const ms = now - (days - 1 - i) * DAY;
    const count = history[dateKey(ms)] ?? 0;
    return { count, isToday: i === days - 1 };
  });

  const streak = currentStreak(history, now);
  const total = Object.values(history).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule py-3">
      <div className="flex items-center gap-4">
        <Kicker>Streak</Kicker>
        <div className="flex items-end gap-[3px]" aria-hidden>
          {cells.map((c, i) => (
            <div
              key={i}
              className={cn(
                "h-6 w-3.5 rounded-[1px] border",
                c.count > 0 ? "border-calm bg-calm" : "border-rule bg-transparent",
                c.isToday && "ring-1 ring-ink ring-offset-1 ring-offset-paper",
              )}
            />
          ))}
        </div>
      </div>
      <div className="mono text-xs tabular-nums text-ink-soft">
        {streak > 0 ? `${streak}-day streak` : "no streak yet"} · {total} done
      </div>
    </div>
  );
}
