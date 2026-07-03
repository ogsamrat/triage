"use client";

import { useRef, useState } from "react";
import { Button, Kicker } from "./primitives";
import { SendIcon } from "./icons";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
  applied?: number;
}

const CHIPS = [
  "What should I drop?",
  "I finished rent — replan the day",
  "Push the essay to Wednesday",
  "Add: buy groceries tomorrow",
];

export function Copilot({
  onSend,
}: {
  onSend: (message: string) => Promise<{ reply: string; appliedCount: number }>;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const { reply, appliedCount } = await onSend(q);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply || "Done.", applied: appliedCount },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I couldn't do that — try rephrasing." },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }),
      );
    }
  };

  return (
    <section aria-labelledby="copilot-head" className="pt-14 sm:pt-20">
      <div className="flex items-end justify-between gap-4 pb-2">
        <span id="copilot-head" className="kicker">
          — Copilot
        </span>
        <span className="kicker">Ask, or instruct</span>
      </div>
      <div className="border-t-2 border-ink" />

      <div className="mt-6 grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-8">
          {messages.length > 0 ? (
            <div ref={scrollRef} className="mb-4 max-h-80 space-y-4 overflow-y-auto pr-1">
              {messages.map((m, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3">
                    <Kicker dash={false}>{m.role === "user" ? "You" : "The editor"}</Kicker>
                    {m.applied ? (
                      <span className="mono text-[0.65rem] uppercase tracking-[0.1em] text-calm">
                        {m.applied} change{m.applied === 1 ? "" : "s"} applied
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mt-1 whitespace-pre-wrap leading-relaxed",
                      m.role === "user" ? "text-ink-soft" : "text-ink",
                    )}
                  >
                    {m.content}
                  </p>
                </div>
              ))}
              {busy ? <p className="mono text-xs text-ink-soft">thinking…</p> : null}
            </div>
          ) : (
            <p className="measure mb-4 font-display text-xl italic text-ink-soft">
              &ldquo;Tell me to drop something, push a deadline, add a task, or reflow the day — I
              change the board, not just the subject.&rdquo;
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question, or tell me what to change…"
              aria-label="Ask or instruct the copilot"
              className="flex-1 rounded-[3px] border border-rule bg-paper-2 px-4 py-2.5 text-base text-ink placeholder:text-ink-soft/70 focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
            />
            <Button type="submit" variant="ink" size="md" disabled={busy || input.trim().length === 0}>
              <SendIcon width={15} height={15} />
              {busy ? "…" : "Send"}
            </Button>
          </form>
        </div>

        <aside className="col-span-12 lg:col-span-4 lg:border-l lg:border-rule lg:pl-6">
          <Kicker>Try</Kicker>
          <ul className="mt-3 space-y-2">
            {CHIPS.map((c) => (
              <li key={c}>
                <button
                  onClick={() => send(c)}
                  disabled={busy}
                  className="text-left font-display text-[0.95rem] italic text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
