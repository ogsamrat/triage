"use client";

import { useRef, useState } from "react";
import { Button, Kicker } from "./primitives";
import { SendIcon } from "./icons";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const CHIPS = [
  "What should I drop?",
  "What can wait until tomorrow?",
  "I've only got 2 hours — what now?",
];

export function Copilot({ context }: { context: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setStreaming(true);

    const FALLBACK = "Lost the thread there — ask me again.";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Workload context rides as its own field so the route can fold it into
        // the system prompt (never evicted by the 12-message window).
        body: JSON.stringify({ messages: next, context }),
      });
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let acc = "";
      if (reader) {
        // Insert the placeholder only when streaming will actually fill it.
        setMessages((m) => [...m, { role: "assistant", content: "" }]);
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
          });
        }
        if (!acc.trim()) {
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: FALLBACK };
            return copy;
          });
        }
      } else {
        const txt = await res.text();
        setMessages((m) => [...m, { role: "assistant", content: txt || FALLBACK }]);
      }
    } catch {
      // If a placeholder bubble was already inserted (mid-stream reject), fill
      // it instead of leaving an empty bubble above the fallback.
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant" && !last.content.trim()) {
          copy[copy.length - 1] = { role: "assistant", content: FALLBACK };
          return copy;
        }
        return [...m, { role: "assistant", content: FALLBACK }];
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <section aria-labelledby="copilot-head" className="pt-14 sm:pt-20">
      <div className="flex items-end justify-between gap-4 pb-2">
        <span id="copilot-head" className="kicker">
          — Copilot
        </span>
        <span className="kicker">Ask the editor</span>
      </div>
      <div className="border-t-2 border-ink" />

      <div className="mt-6 grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-8">
          {messages.length > 0 ? (
            <div
              ref={scrollRef}
              className="mb-4 max-h-80 space-y-4 overflow-y-auto pr-1"
            >
              {messages.map((m, i) => (
                <div key={i}>
                  <Kicker dash={false}>
                    {m.role === "user" ? "You" : "The editor"}
                  </Kicker>
                  <p
                    className={cn(
                      "mt-1 whitespace-pre-wrap leading-relaxed",
                      m.role === "user" ? "text-ink-soft" : "text-ink",
                    )}
                  >
                    {m.content || (streaming ? "…" : "")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="measure mb-4 font-display text-xl italic text-ink-soft">
              &ldquo;Tell me what to cut, what can wait, or how to fit it into the
              hours I&rsquo;ve actually got.&rdquo;
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
              placeholder="Ask about your workload…"
              aria-label="Ask the copilot"
              className="flex-1 rounded-[3px] border border-rule bg-paper-2 px-4 py-2.5 text-base text-ink placeholder:text-ink-soft/70 focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
            />
            <Button
              type="submit"
              variant="ink"
              size="md"
              disabled={streaming || input.trim().length === 0}
            >
              <SendIcon width={15} height={15} />
              {streaming ? "…" : "Ask"}
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
                  disabled={streaming}
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
