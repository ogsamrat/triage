"use client";

import { useState } from "react";
import { controlClasses } from "./primitives";
import { ShareIcon } from "./icons";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function ShareButton({
  headline,
  focus,
  tasks,
  streak,
}: {
  headline: string;
  focus: string;
  tasks: number;
  streak: number;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const site =
      typeof window !== "undefined" ? window.location.origin : "https://triage-plum.vercel.app";
    const params = new URLSearchParams({
      headline: headline.slice(0, 64),
      focus,
      tasks: String(tasks),
      streak: String(streak),
    });
    const cardUrl = `${site}/api/og?${params.toString()}`;

    const nav = typeof navigator !== "undefined" ? (navigator as any) : undefined;
    if (nav?.share) {
      try {
        await nav.share({
          title: "Triage — my plan",
          text: "My day, triaged: what to do right now, and the plan to finish it.",
          url: site,
        });
        return;
      } catch {
        /* user cancelled — fall through to copy + open */
      }
    }
    try {
      await navigator.clipboard.writeText(site);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
    window.open(cardUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button className={controlClasses("outline", "md")} onClick={share}>
      <ShareIcon width={15} height={15} />
      {copied ? "Link copied" : "Share plan"}
    </button>
  );
}
