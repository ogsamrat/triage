import { createGroq } from "@ai-sdk/groq";

/**
 * The model lives in one place so it's swappable.
 *
 * Default: Groq — Llama 3.3 70B (fast, supports tool/structured output).
 * The key is read from GROQ_API_KEY.
 *
 * To switch back to Anthropic:
 *   import { anthropic } from "@ai-sdk/anthropic";
 *   export const model = anthropic("claude-sonnet-4-6");   // set ANTHROPIC_API_KEY
 *
 * To use OpenAI instead:
 *   npm install @ai-sdk/openai
 *   import { openai } from "@ai-sdk/openai";
 *   export const model = openai("gpt-4o");                 // set OPENAI_API_KEY
 */

/**
 * Sanitize the key: strip a leading BOM (char code 0xFEFF) and surrounding
 * whitespace. Some shells / secret stores prepend a BOM when a value is piped
 * in, which makes the Authorization header an invalid ByteString and throws at
 * request time. Trimming here keeps the app robust to that.
 */
function cleanKey(raw: string | undefined): string {
  let key = (raw ?? "").trim();
  while (key.length > 0 && key.charCodeAt(0) === 0xfeff) {
    key = key.slice(1).trim();
  }
  return key;
}

const apiKey = cleanKey(process.env.GROQ_API_KEY);

const groq = createGroq({ apiKey });

export const model = groq("llama-3.3-70b-versatile");

/** Returns true when an API key is configured (so routes can fail gracefully). */
export function hasApiKey(): boolean {
  return Boolean(
    apiKey || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
  );
}
