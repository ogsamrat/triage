import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { model, hasApiKey } from "@/lib/ai";
import { ScheduleGenSchema } from "@/lib/schemas";
import { normalizeSchedule } from "@/lib/normalize";
import { withRetry, EDITORIAL_SYSTEM } from "@/lib/retry";
import type { Task, WorkingHours } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    if (!hasApiKey()) {
      return NextResponse.json(
        { error: "No API key configured. Add ANTHROPIC_API_KEY to .env.local and restart." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const tasks: Task[] = Array.isArray(body?.tasks) ? body.tasks : [];
    const now: string = (body?.now ?? new Date().toISOString()).toString();
    const availableHours: number | null =
      typeof body?.availableHours === "number" ? body.availableHours : null;
    const workingHours: WorkingHours = body?.workingHours ?? { start: "09:00", end: "21:00" };
    const reflow: boolean = body?.reflow === true;

    const open = tasks.filter((t) => !t.done);
    if (open.length === 0) {
      return NextResponse.json({ blocks: [] });
    }

    const taskLines = open
      .map(
        (t) =>
          `- id=${t.id} | "${t.title}" | type=${t.type} | est=${t.estimatedMinutes}min | due=${t.deadline} | importance=${t.importance}/5`,
      )
      .join("\n");

    const constraint =
      availableHours == null
        ? `Schedule a realistic full day within the working hours.`
        : availableHours <= 0
          ? `The user has no focused time today. Don't schedule focus work — return an empty plan or only essential buffers.`
          : `The user only has ${availableHours} hour(s) of focused time today. Schedule only the work that earns the time — protect the soonest deadlines — and leave the rest unscheduled.`;

    const reflowNote = reflow
      ? `\nTHE DAY IS ALREADY UNDERWAY: the earlier plan slipped. Rebuild only what's left, starting from the current time, and be honest about the reduced hours remaining — protect the soonest deadlines and drop what no longer fits.`
      : "";

    const prompt = `Build a concrete, time-blocked plan starting from the current time. Lay the tasks into blocks that respect deadlines and working hours, with NO overlaps. Front-load the work that's both important and due soonest. Insert short breaks between long focus blocks (a 10-15 min break after ~90 min of focus, plus a lunch break if the day is long). Be realistic — don't pack 10 hours into 4.${reflowNote}

Current datetime (local, floating): ${now}
Working hours: ${workingHours.start}–${workingHours.end}
${constraint}

Tasks (use these exact ids on each block; use an empty taskId for breaks/buffers):
${taskLines}

For each block return: taskId, a short specific title (what actually happens in the block), start and end as floating-local "YYYY-MM-DDTHH:MM:SS", and kind (one of: focus, admin, break, buffer). Start blocks at or after the current time.`;

    const { object } = await withRetry(() =>
      generateObject({
        model,
        schema: ScheduleGenSchema,
        system: EDITORIAL_SYSTEM,
        prompt,
        temperature: 0.4,
      }),
    );

    return NextResponse.json({ blocks: normalizeSchedule(object) });
  } catch (err) {
    console.error("[/api/schedule]", err);
    return NextResponse.json(
      { error: "Couldn't draw up the plan. Your previous plan is intact — try again." },
      { status: 500 },
    );
  }
}
