import type { DeadlineStatus } from "@/lib/utils";
import type { BlockKind } from "@/lib/types";

export function statusText(s: DeadlineStatus): string {
  return {
    overdue: "text-signal",
    soon: "text-amber",
    upcoming: "text-ink",
    later: "text-ink-soft",
  }[s];
}

export function statusDot(s: DeadlineStatus): string {
  return {
    overdue: "bg-signal",
    soon: "bg-amber",
    upcoming: "bg-ink",
    later: "bg-ink-soft",
  }[s];
}

export function typeLabel(t: string): string {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Task";
}

export function blockKindLabel(k: BlockKind): string {
  return { focus: "Focus", admin: "Admin", break: "Break", buffer: "Buffer" }[k];
}

/** Left accent color for plan blocks by kind. Focus stays ink so vermilion is
 *  reserved for genuine urgency, not "this is a work block". */
export function blockAccent(k: BlockKind): string {
  return {
    focus: "bg-ink",
    admin: "bg-amber",
    break: "bg-calm",
    buffer: "bg-rule",
  }[k];
}
