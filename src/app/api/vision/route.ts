import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { visionModel, hasApiKey } from "@/lib/ai";
import { IngestGenSchema } from "@/lib/schemas";
import { normalizeIngest } from "@/lib/normalize";
import { withRetry, EDITORIAL_SYSTEM } from "@/lib/retry";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  try {
    if (!hasApiKey()) {
      return NextResponse.json(
        { error: "No API key configured. Add GROQ_API_KEY to .env.local and restart." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const image: string = (body?.image ?? "").toString();
    const now: string = (body?.now ?? new Date().toISOString()).toString();
    const timezone: string = (body?.timezone ?? "local").toString();

    if (!image.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "That doesn't look like an image. Drop a PNG or JPEG screenshot." },
        { status: 400 },
      );
    }
    if (image.length > 6_000_000) {
      return NextResponse.json(
        { error: "That image is too large — try a smaller screenshot." },
        { status: 400 },
      );
    }

    const prompt = `This image is a screenshot, syllabus, whiteboard, planner, or handwritten note. Read it carefully and extract every actionable task or deadline you can find.

Current datetime (local, floating): ${now}
Timezone: ${timezone}

For each task provide: a clean title, a type (assignment, exam, meeting, bill, errand, interview, other), a resolved deadline as floating-local "YYYY-MM-DDTHH:MM:SS" (resolve any dates you can read against the current datetime above), a realistic effort estimate in minutes, importance (1-5), urgency (1-5), a global priorityRank (1 = do first), and one sharp editorial rationale sentence.

Then choose the single task to START RIGHT NOW with a punchy headline, a one-sentence why, and a first step doable in under five minutes. If the image has no tasks, return an empty tasks array.`;

    const { object } = await withRetry(() =>
      generateObject({
        model: visionModel,
        schema: IngestGenSchema,
        mode: "json",
        system: EDITORIAL_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image },
            ],
          },
        ],
        temperature: 0.3,
      }),
    );

    const result = normalizeIngest(object);
    if (result.tasks.length === 0) {
      return NextResponse.json(
        { error: "I couldn't read any tasks from that image. Try a clearer shot." },
        { status: 200 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/vision]", err);
    // Soft failure (200 + error), matching /api/command and the empty-tasks branch,
    // so the UI shows a friendly message and keeps its board.
    return NextResponse.json(
      { error: "Couldn't read that image. Try again, or type your list instead." },
      { status: 200 },
    );
  }
}
