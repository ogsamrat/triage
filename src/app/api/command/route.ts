import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { model, hasApiKey } from "@/lib/ai";
import { CommandGenSchema } from "@/lib/schemas";
import { normalizeActions } from "@/lib/normalize";
import { withRetry, EDITORIAL_SYSTEM } from "@/lib/retry";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    if (!hasApiKey()) {
      return NextResponse.json(
        { reply: "I'd need an API key to help. Add GROQ_API_KEY to .env.local.", actions: [] },
        { status: 200 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const message: string = (body?.message ?? "").toString();
    const tasks: Task[] = Array.isArray(body?.tasks) ? body.tasks : [];
    const now: string = (body?.now ?? new Date().toISOString()).toString();
    const timezone: string = (body?.timezone ?? "local").toString();

    if (message.trim().length < 1) {
      return NextResponse.json({ reply: "Tell me what to change.", actions: [] });
    }

    const taskLines = tasks
      .map(
        (t) =>
          `- id=${t.id} | "${t.title}" | ${t.type} | due ${t.deadline || "—"} | ${
            t.done ? "done" : "open"
          }`,
      )
      .join("\n");

    const prompt = `Current datetime (local, floating): ${now}
Timezone: ${timezone}

The user's tasks:
${taskLines || "(none)"}

The user says:
"""
${message.slice(0, 1200)}
"""

Decide what to change and return a short reply plus a list of actions. Use the EXACT task ids above. Available actions:
- complete { taskId } — mark a task done
- reopen { taskId } — mark a done task not-done
- remove { taskId } — delete a task
- reschedule { taskId, deadline } — set a new floating-local "YYYY-MM-DDTHH:MM:SS" (resolve relative dates against now)
- add { title, type?, deadline?, estimatedMinutes?, importance?, urgency? } — add a new task
- replan {} — include this (once) when the plan should be rebuilt after your changes, or when the user asks to re-plan / reflow the day

If the user is only asking a question (e.g. "what should I drop?"), return an empty actions array and answer in the reply. Keep the reply to one or two sharp sentences.`;

    const { object } = await withRetry(() =>
      generateObject({
        model,
        schema: CommandGenSchema,
        system: EDITORIAL_SYSTEM,
        prompt,
        temperature: 0.3,
      }),
    );

    return NextResponse.json({
      reply: (object.reply || "").trim() || "Done.",
      actions: normalizeActions(object),
    });
  } catch (err) {
    console.error("[/api/command]", err);
    return NextResponse.json(
      { reply: "I couldn't make that change. Try rephrasing.", actions: [] },
      { status: 200 },
    );
  }
}
