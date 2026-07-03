"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { icsToText } from "@/lib/ics";
import { Button, IconButton, Kicker, controlClasses } from "./primitives";
import { ArrowRightIcon, CalendarIcon, ImageIcon, MicIcon, StopIcon } from "./icons";
import { cn } from "@/lib/utils";

const PLACEHOLDER =
  "calc problem set due Friday, 1500-word essay on the French Revolution Monday, call the dentist, rent due the 1st, prep for a 2pm interview Thursday…";

export function BrainDump({
  loading,
  error,
  onIngest,
  onIngestImage,
}: {
  loading: boolean;
  error: string | null;
  onIngest: (text: string) => void;
  onIngestImage: (dataUrl: string) => void;
}) {
  const [value, setValue] = useState("");
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const baseRef = useRef("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const icsInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageFile = (file: File) => {
    setNote(null);
    if (!file.type.startsWith("image/")) {
      setNote("That's not an image.");
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      const url = String(r.result || "");
      if (url.startsWith("data:image/")) onIngestImage(url);
    };
    r.readAsDataURL(file);
  };

  const handleIcsFile = (file: File) => {
    setNote(null);
    const r = new FileReader();
    r.onload = () => {
      const text = icsToText(String(r.result || ""));
      if (text.trim()) onIngest(text);
      else setNote("Couldn't find any events in that .ics file.");
    };
    r.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.type.startsWith("image/")) handleImageFile(f);
    else if (f.name.toLowerCase().endsWith(".ics") || f.type === "text/calendar") handleIcsFile(f);
    else setNote("Drop a screenshot or an .ics file.");
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of items) {
      if (it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) {
          e.preventDefault();
          handleImageFile(f);
          return;
        }
      }
    }
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
            Type, speak, drop a <em className="italic">screenshot</em> of your syllabus, or import a{" "}
            <em className="italic">.ics</em>. Triage parses it into real dates, ranks it, and tells you
            what to start.
          </p>

          <div
            className="relative mt-6"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                // Keep manual edits from being clobbered by the next transcript merge.
                if (listening) baseRef.current = e.target.value;
              }}
              onPaste={onPaste}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
              rows={5}
              aria-label="Everything you're avoiding"
              placeholder={PLACEHOLDER}
              className={cn(
                "w-full resize-y rounded-[3px] border bg-paper-2 p-5 text-lg leading-relaxed text-ink",
                "placeholder:text-ink-soft/70 focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 transition-colors",
                listening ? "border-signal" : dragging ? "border-ink" : "border-rule",
              )}
            />
            {dragging ? (
              <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-[3px] bg-paper-2/80">
                <span className="kicker text-ink">Drop screenshot or .ics</span>
              </div>
            ) : null}
            {listening ? (
              <span className="absolute right-4 top-4 flex items-center gap-2 text-signal">
                <span className="h-2 w-2 rounded-full bg-signal signal-blink" />
                <span className="kicker text-signal">Listening</span>
              </span>
            ) : null}
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageFile(f);
              e.target.value = "";
            }}
          />
          <input
            ref={icsInputRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleIcsFile(f);
              e.target.value = "";
            }}
          />

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

            <button
              className={controlClasses("outline", "sm")}
              onClick={() => imageInputRef.current?.click()}
              disabled={loading}
            >
              <ImageIcon width={14} height={14} />
              Screenshot
            </button>
            <button
              className={controlClasses("outline", "sm")}
              onClick={() => icsInputRef.current?.click()}
              disabled={loading}
            >
              <CalendarIcon width={14} height={14} />
              Import .ics
            </button>

            <Button variant="solid" size="lg" onClick={submit} disabled={value.trim().length < 2 || loading}>
              {loading ? "Triaging…" : "Triage it"}
              {!loading ? <ArrowRightIcon width={16} height={16} /> : null}
            </Button>

            <span className="mono ml-auto text-xs text-ink-soft tabular-nums">
              {value.trim().length} chars
            </span>
          </div>

          {error || note ? (
            <p className="mt-3 text-sm text-signal" role="alert">
              {error || note}
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
              <Kicker>Snap it</Kicker>
              <p className="mt-2 text-sm text-ink-soft measure">
                Drop or paste a photo of a syllabus, whiteboard, or planner and Triage reads the tasks
                straight off it.
              </p>
            </div>
            <p className="mono text-xs text-ink-soft">Ctrl / Cmd + Enter to triage</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
