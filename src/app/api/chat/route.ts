import { streamText } from "ai";
import { model, hasApiKey } from "@/lib/ai";
import { EDITORIAL_SYSTEM } from "@/lib/retry";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function plain(text: string): Response {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

const FALLBACK = "Lost my train of thought. Ask again in a moment.";

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return plain(
      "I'd need an API key to weigh in. Add ANTHROPIC_API_KEY to .env.local and restart.",
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const raw: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const context = typeof body?.context === "string" ? body.context : "";
    const messages = raw
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .slice(-12);

    if (messages.length === 0) {
      return plain("Ask me what to drop, what to start, or how to fit it all in.");
    }

    const result = streamText({
      model,
      system: `${EDITORIAL_SYSTEM}

You are answering quick questions about the user's current workload as a trusted copilot. Be brief — two or three sentences, occasionally a short list. Give a clear recommendation, not a survey of options. Plain prose; no markdown headings.${
        context ? `\n\nThe user's current workload, ranked:\n${context}` : ""
      }`,
      messages,
    });

    // Forward the text stream manually so a mid-generation failure (or a
    // silently-ended stream) always yields readable text to the client — the
    // Copilot reply is never left blank.
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let received = false;
        try {
          for await (const chunk of result.textStream) {
            received = true;
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (err) {
          console.error("[/api/chat stream]", err);
        } finally {
          if (!received) controller.enqueue(encoder.encode(FALLBACK));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[/api/chat]", err);
    return plain(FALLBACK);
  }
}
