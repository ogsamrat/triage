"use client";

import { issueDate } from "@/lib/utils";
import { useNow } from "@/hooks/useNow";
import { Rule } from "./primitives";
import { ThemeToggle } from "./ThemeToggle";

export function Masthead() {
  const now = useNow();

  return (
    <header className="pt-4">
      <Rule />
      <div className="flex items-center justify-between gap-4 py-2.5">
        <span className="kicker hidden sm:inline">Triage Daily</span>
        <span className="kicker text-center grow tabular-nums">
          {now ? issueDate(now) : "Daily Edition"}
        </span>
        <div className="flex items-center gap-3">
          <span className="kicker hidden md:inline">Late &amp; Unplanned</span>
          <ThemeToggle />
        </div>
      </div>
      <Rule />

      <div className="text-center py-7 sm:py-10">
        <h1 className="type-display">Triage</h1>
      </div>

      <Rule />
      <p className="kicker text-center py-2.5">
        First aid for your to-do list — the work won&rsquo;t do itself, the plan
        will
      </p>
      <div className="border-t-2 border-ink" />
    </header>
  );
}
