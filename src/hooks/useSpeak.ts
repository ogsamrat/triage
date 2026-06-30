"use client";

import { useCallback, useEffect, useState } from "react";

/** Text-to-speech via the Web Speech synthesis API. Feature-detected. */
export function useSpeak() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.pitch = 1;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setSpeaking(true);
    },
    [supported],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, stop };
}
