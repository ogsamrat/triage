"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { Button, IconButton, Kicker } from "./primitives";
import { ArrowRightIcon, MicIcon, StopIcon } from "./icons";
import { cn } from "@/lib/utils";

const PLACEHOLDER =
  "calc problem set due Friday, 1500-word essay on the French Revolution Monday, call the dentist, rent due the 1st, prep for a 2pm interview Thursday…";

export function BrainDump({
  loading,
  error,
  onIngest,
}: {
  loading: boolean;
  error: string | null;
  onIngest: (text: string) => void;
}) {
  const [value, setValue] = useState("");
  const baseRef = useRef("");
  const { supported, listening, transcript, start, stop } = useSpeech();

  useEffect(() => {
    if (!listening) return;
    const base = baseRef.current;
    setValue(base ? `${base} ${transcript}` : transcript);
  }, [transcript, listening]);

  const toggleMic = () => {
    if (listening) {
      stop();
      baseRef.current = value;
    } else {
      baseRef.current = value.trim();
      start();
    }
  };

  const submit = () => {
    const text = value.trim();
    if (text.length < 2 || loading) return;
    if (listening) stop();
    onIngest(text);
  };

  return (
    <section aria-labelledby="braindump-head" className="pt-12 sm:pt-16">
      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-8">
          <Kicker>Brain dump</Kicker>
          <h2 id="braindump-head" className="type-h1 mt-3">
            You&rsquo;re not behind.
            <br />
            You&rsquo;re <em className="italic">unplanned</em>.
          </h2>
          <p className="measure mt-4 text-ink-soft">
            Type or speak the whole anxious pile — assignments, bills, the call
            you keep dodging. Triage parses it into real dates, ranks it, and
            tells you what to start.
          </p>

          <div className="relative mt-6">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
              rows={5}
              aria-label="Everything you're avoiding"
              placeholder={PLACEHOLDER}
              className={cn(
                "w-full resize-y rounded-[3px] border bg-paper-2 p-5 text-lg leading-relaxed text-ink",
                "placeholder:text-ink-soft/70 focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 transition-colors",
                listening ? "border-signal" : "border-rule",
              )}
            />
            {listening ? (
              <span className="absolute right-4 top-4 flex items-center gap-2 text-signal">
                <span className="h-2 w-2 rounded-full bg-signal signal-blink" />
                <span className="kicker text-signal">Listening</span>
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {supported ? (
              <IconButton
                label={listening ? "Stop dictation" : "Dictate your list"}
                active={listening}
                aria-pressed={listening}
                onClick={toggleMic}
              >
                {listening ? <StopIcon /> : <MicIcon />}
              </IconButton>
            ) : null}

            <Button
              variant="solid"
              size="lg"
              onClick={submit}
              disabled={value.trim().length < 2 || loading}
            >
              {loading ? "Triaging…" : "Triage it"}
              {!loading ? <ArrowRightIcon width={16} height={16} /> : null}
            </Button>

            <span className="mono ml-auto text-xs text-ink-soft tabular-nums">
              {value.trim().length} chars
            </span>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-signal" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {/* Marginalia */}
        <aside className="col-span-12 lg:col-span-4 lg:border-l lg:border-rule lg:pl-6">
          <div className="space-y-5">
            <div>
              <Kicker>Speak it</Kicker>
              <p className="mt-2 text-sm text-ink-soft measure">
                {supported
                  ? "Tap the mic and ramble. Triage transcribes live and sorts the mess for you."
                  : "Voice input isn't available in this browser, but typing works just as well."}
              </p>
            </div>
            <div>
              <Kicker>How it ranks</Kicker>
              <p className="mt-2 text-sm text-ink-soft measure">
                Not first-in-first-out. Deadlines and stakes, weighed together —
                the thing that matters most rises to the top.
              </p>
            </div>
            <p className="mono text-xs text-ink-soft">Ctrl / Cmd + Enter to triage</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
