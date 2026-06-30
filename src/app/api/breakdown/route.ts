import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { model, hasApiKey } from "@/lib/ai";
import { BreakdownGenSchema } from "@/lib/schemas";
import { normalizeSteps } from "@/lib/normalize";
import { withRetry, EDITORIAL_SYSTEM } from "@/lib/retry";

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
    const task = body?.task ?? {};
    const title: string = (task?.title ?? "").toString();

    if (title.trim().length < 2) {
      return NextResponse.json({ error: "No task to break down." }, { status: 400 });
    }

    const prompt = `Break this task into 3-8 concrete, startable steps that build momentum. Each step should take roughly 10-30 minutes. The FIRST step must be trivially easy to begin — the kind of thing you can do without thinking. Order them so finishing one naturally pulls you into the next. Be specific to THIS task, not generic advice.

Task: "${title}"
Type: ${task?.type ?? "other"}
Estimated total effort: ${task?.estimatedMinutes ?? "?"} minutes
Due: ${task?.deadline ?? "?"}
Why it matters: ${task?.rationale ?? ""}`;

    const { object } = await withRetry(() =>
      generateObject({
        model,
        schema: BreakdownGenSchema,
        system: EDITORIAL_SYSTEM,
        prompt,
        temperature: 0.5,
      }),
    );

    return NextResponse.json({ steps: normalizeSteps(object) });
  } catch (err) {
    console.error("[/api/breakdown]", err);
    return NextResponse.json(
      { error: "Couldn't break it down right now. Try again." },
      { status: 500 },
    );
  }
}
