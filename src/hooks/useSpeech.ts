"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Thin wrapper over the Web Speech API (SpeechRecognition). Feature-detects and
 * degrades gracefully: if unsupported, `supported` stays false and the UI shows
 * a typed-only fallback. `transcript` is the running text of the current session.
 */
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<any>(null);
  const finalRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i];
        if (seg.isFinal) finalRef.current += seg[0].transcript;
        else interim += seg[0].transcript;
      }
      setTranscript((finalRef.current + interim).replace(/\s+/g, " ").trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
    finalRef.current = "";
    setTranscript("");
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop };
}
