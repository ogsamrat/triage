import { groq } from "@ai-sdk/groq";

/**
 * The model lives in one place so it's swappable.
 *
 * Default: Groq — Llama 3.3 70B (fast, supports tool/structured output).
 * The Groq provider reads GROQ_API_KEY from the environment.
 *
 * To switch to Anthropic:  anthropic("claude-sonnet-4-6")  (set ANTHROPIC_API_KEY)
 * To use OpenAI:           openai("gpt-4o")                 (set OPENAI_API_KEY)
 */
export const model = groq("llama-3.3-70b-versatile");

/** Returns true when an API key is configured (so routes can fail gracefully). */
export function hasApiKey(): boolean {
  return Boolean(
    process.env.GROQ_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY,
  );
}
