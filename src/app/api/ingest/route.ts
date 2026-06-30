import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { model, hasApiKey } from "@/lib/ai";
import { IngestGenSchema } from "@/lib/schemas";
import { normalizeIngest } from "@/lib/normalize";
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
    const text: string = (body?.text ?? "").toString();
    const now: string = (body?.now ?? new Date().toISOString()).toString();
    const timezone: string = (body?.timezone ?? "local").toString();

    if (text.trim().length < 2) {
      return NextResponse.json(
        { error: "Tell me what's keeping you up — type or speak your list." },
        { status: 400 },
      );
    }

    const prompt = `Current datetime (local, floating): ${now}
Timezone: ${timezone}

The user dumped everything they're avoiding:
"""
${text.slice(0, 6000)}
"""

Parse this into discrete, concrete tasks. For each task provide:
- a clean, specific title (strip filler words)
- a type (assignment, exam, meeting, bill, errand, interview, or other)
- a resolved deadline as floating-local "YYYY-MM-DDTHH:MM:SS" (assignments with only a day default to 23:59; meetings/interviews keep their stated time)
- a realistic effort estimate in minutes (be honest — most people lowball)
- importance (1-5) and urgency (1-5)
- a global priorityRank (1 = do first), blending deadline proximity and importance
- one sharp editorial rationale sentence

Then choose the single task to START RIGHT NOW. This is not always the most urgent one — pick where starting now pays off most (big work that needs runway often beats a five-minute errand). Give it a punchy 3-6 word headline, a one-sentence "why this, why now", and a first step doable in under five minutes.

If there are no real tasks in the text, return an empty tasks array.`;

    const { object } = await withRetry(() =>
      generateObject({
        model,
        schema: IngestGenSchema,
        system: EDITORIAL_SYSTEM,
        prompt,
        temperature: 0.4,
      }),
    );

    const result = normalizeIngest(object);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/ingest]", err);
    return NextResponse.json(
      { error: "The triage stalled. Your board is unchanged — try again." },
      { status: 500 },
    );
  }
}
