"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { FocusPrefs, Step, Task } from "@/lib/types";
import { cn, formatDuration, totalMinutes } from "@/lib/utils";
import { Button, IconButton, Kicker } from "./primitives";
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
} from "./icons";

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function FocusMode({
  task,
  steps,
  prefs,
  onToggleStep,
  onComplete,
  onClose,
}: {
  task: Task;
  steps: Step[];
  prefs: FocusPrefs;
  onToggleStep: (stepId: string) => void;
  onComplete: () => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const focusSecs = Math.max(1, prefs.focusMinutes) * 60;
  const breakSecs = Math.max(1, prefs.breakMinutes) * 60;

  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(focusSecs);
  const [cycles, setCycles] = useState(0);

  const total = phase === "focus" ? focusSecs : breakSecs;
  const progress = 1 - secondsLeft / total;

  // Countdown with atomic phase rollover on the 1 -> 0 transition (no "0:00" frame)
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        if (phase === "focus") {
          setCycles((c) => c + 1);
          setPhase("break");
          return breakSecs;
        }
        setPhase("focus");
        return focusSecs;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, focusSecs, breakSecs]);

  // Escape to close, Tab trap, scroll lock, and focus management (WCAG 2.4.3)
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus();
    };
  }, [onClose]);

  const reset = () => {
    setSecondsLeft(phase === "focus" ? focusSecs : breakSecs);
    setRunning(false);
  };
  const skip = () => {
    if (phase === "focus") {
      setPhase("break");
      setSecondsLeft(breakSecs);
    } else {
      setPhase("focus");
      setSecondsLeft(focusSecs);
    }
    setRunning(true);
  };

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Focus session: ${task.title}`}
    >
      <div
        className="absolute inset-0 bg-ink/45"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={reduce ? false : { opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl rounded-[4px] border border-ink bg-paper p-6 outline-none sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <Kicker>{phase === "focus" ? "Focus" : "Break"}</Kicker>
            <h2 className="type-h2 mt-1.5 max-w-[26ch]">{task.title}</h2>
          </div>
          <IconButton label="Close focus mode" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Timer */}
        <div className="mt-6 text-center">
          <div
            className={cn(
              "type-numeral font-display leading-none",
              "text-[clamp(4rem,16vw,7rem)]",
              phase === "break" ? "text-calm" : "text-ink",
            )}
          >
            {mmss(secondsLeft)}
          </div>
          <div className="mono mt-1 text-xs uppercase tracking-[0.12em] text-ink-soft">
            {phase === "focus" ? "Deep work" : "Step away"} · {cycles} done
          </div>
        </div>

        {/* Progress */}
        <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-paper-3">
          <div
            className={cn("h-full transition-[width] duration-1000 ease-linear", phase === "break" ? "bg-calm" : "bg-ink")}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>

        {/* Controls */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button variant="ink" size="md" onClick={() => setRunning((r) => !r)}>
            {running ? <PauseIcon width={15} height={15} /> : <PlayIcon width={15} height={15} />}
            {running ? "Pause" : "Start"}
          </Button>
          <Button variant="outline" size="md" onClick={reset}>
            <RefreshIcon width={15} height={15} />
            Reset
          </Button>
          <Button variant="outline" size="md" onClick={skip}>
            <ArrowRightIcon width={15} height={15} />
            {phase === "focus" ? "Break" : "Focus"}
          </Button>
        </div>

        {/* Steps */}
        {steps.length > 0 ? (
          <div className="mt-7 border-t border-rule pt-5">
            <div className="flex items-end justify-between pb-2">
              <Kicker>The checklist</Kicker>
              <span className="mono text-xs tabular-nums text-ink-soft">
                {doneCount}/{steps.length} · {formatDuration(totalMinutes(steps))}
              </span>
            </div>
            <ul className="max-h-52 space-y-1 overflow-y-auto pr-1">
              {steps.map((s) => (
                <li key={s.id} className="flex items-start gap-3 border-b border-rule py-2 last:border-0">
                  <button
                    role="checkbox"
                    aria-checked={Boolean(s.done)}
                    aria-label={`Mark "${s.label}" ${s.done ? "incomplete" : "complete"}`}
                    onClick={() => onToggleStep(s.id)}
                    className={cn(
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[2px] border transition-colors cursor-pointer",
                      s.done ? "border-calm bg-calm text-paper" : "border-ink/50 hover:border-ink",
                    )}
                  >
                    {s.done ? <CheckIcon width={13} height={13} /> : null}
                  </button>
                  <span className={cn("flex-1 text-sm leading-snug", s.done ? "text-ink-soft line-through" : "text-ink")}>
                    {s.label}
                  </span>
                  <span className="mono shrink-0 text-xs tabular-nums text-ink-soft">{s.minutes}m</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-7 flex items-center justify-between border-t border-rule pt-4">
          <button
            onClick={onClose}
            className="mono text-xs uppercase tracking-[0.08em] text-ink-soft underline-offset-4 hover:text-ink hover:underline cursor-pointer"
          >
            Leave focus
          </button>
          <Button variant="solid" size="md" onClick={onComplete}>
            <CheckIcon width={15} height={15} />
            Mark done
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
