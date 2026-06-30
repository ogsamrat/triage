import { TASK_TYPES, type Block, type BlockKind, type Task, type TaskType } from "./types";
import type { BreakdownGen, IngestGen, ScheduleGen } from "./schemas";
import { clamp, floatingToMs, genId, toFloatingISO } from "./utils";
import type { RightNow, Step } from "./types";

function normalizeType(raw: string | undefined): TaskType {
  const t = (raw || "").toLowerCase().trim();
  return (TASK_TYPES as readonly string[]).includes(t) ? (t as TaskType) : "other";
}

function normalizeKind(raw: string | undefined): BlockKind {
  const k = (raw || "").toLowerCase().trim();
  if (k === "focus" || k === "admin" || k === "break" || k === "buffer") return k;
  if (k.includes("break") || k.includes("rest") || k.includes("lunch")) return "break";
  if (k.includes("buffer") || k.includes("commute") || k.includes("travel")) return "buffer";
  if (k.includes("admin") || k.includes("email") || k.includes("call")) return "admin";
  return "focus";
}

/** Coerce a possibly-loose datetime into a floating-local ISO string. */
function cleanDateTime(raw: string): string {
  if (!raw) return raw;
  // Strip a trailing Z or numeric offset; we treat everything as floating-local.
  return raw.replace(/(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/i, "").trim();
}

export function normalizeIngest(gen: IngestGen): { tasks: Task[]; rightNow: RightNow } {
  const seen = new Set<string>();
  const tasks: Task[] = (gen.tasks || []).map((t, i) => {
    let id = (t.id || "").trim() || genId("t");
    if (seen.has(id)) id = `${id}_${i}`;
    seen.add(id);
    return {
      id,
      title: (t.title || "Untitled task").trim(),
      type: normalizeType(t.type),
      deadline: cleanDateTime(t.deadline),
      estimatedMinutes: Math.max(5, Math.round(Number(t.estimatedMinutes) || 30)),
      importance: clamp(Math.round(Number(t.importance) || 3), 1, 5),
      urgency: clamp(Math.round(Number(t.urgency) || 3), 1, 5),
      priorityRank: Math.round(Number(t.priorityRank) || i + 1),
      rationale: (t.rationale || "").trim(),
      done: false,
    };
  });

  // Stable sort by priorityRank, then re-index 1..n so the board is clean.
  tasks.sort((a, b) => a.priorityRank - b.priorityRank);
  tasks.forEach((t, i) => (t.priorityRank = i + 1));

  // Resolve rightNow against a real task; fall back to the top-ranked one.
  let rnId = (gen.rightNow?.taskId || "").trim();
  if (!tasks.some((t) => t.id === rnId)) rnId = tasks[0]?.id ?? "";

  const rightNow: RightNow = {
    taskId: rnId,
    headline: (gen.rightNow?.headline || tasks[0]?.title || "Start here").trim(),
    why: (gen.rightNow?.why || tasks[0]?.rationale || "").trim(),
    firstStep: (gen.rightNow?.firstStep || "Open the document and write one sentence.").trim(),
  };

  return { tasks, rightNow };
}

export function normalizeSteps(gen: BreakdownGen): Step[] {
  return (gen.steps || [])
    .filter((s) => (s.label || "").trim().length > 0)
    .map((s) => ({
      id: genId("step"),
      label: (s.label || "").trim(),
      minutes: clamp(Math.round(Number(s.minutes) || 20), 5, 90),
      done: false,
    }));
}

export function normalizeSchedule(gen: ScheduleGen): Block[] {
  const blocks: Block[] = (gen.blocks || [])
    .filter((b) => (b.start || "").length > 0 && (b.end || "").length > 0)
    .map((b) => ({
      id: genId("block"),
      taskId: (b.taskId || "").trim(),
      title: (b.title || "Focus block").trim(),
      start: cleanDateTime(b.start || ""),
      end: cleanDateTime(b.end || ""),
      kind: normalizeKind(b.kind || ""),
    }))
    // Drop backwards / zero-length blocks the model occasionally emits.
    .filter((b) => {
      const s = floatingToMs(b.start);
      const e = floatingToMs(b.end);
      return Number.isFinite(s) && Number.isFinite(e) && e > s;
    });

  blocks.sort((a, b) => a.start.localeCompare(b.start));

  // Walk forward: if a block starts before the previous one ends, shift it
  // (preserving its duration) so the timeline never overlaps. Re-emit as
  // floating-local ISO via toFloatingISO so wall-clock times round-trip.
  for (let i = 1; i < blocks.length; i++) {
    const prevEnd = floatingToMs(blocks[i - 1].end);
    const curStart = floatingToMs(blocks[i].start);
    if (curStart < prevEnd) {
      const dur = floatingToMs(blocks[i].end) - curStart;
      blocks[i].start = toFloatingISO(new Date(prevEnd));
      blocks[i].end = toFloatingISO(new Date(prevEnd + dur));
    }
  }

  return blocks;
}
