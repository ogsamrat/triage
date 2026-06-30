import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Triage — first aid for your to-do list",
  description:
    "An AI productivity copilot that tells you what to do right now, and breaks it down so you actually start. Panic, then plan, then motion.",
  applicationName: "Triage",
  authors: [{ name: "Triage" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2e9" },
    { media: "(prefers-color-scheme: dark)", color: "#15140e" },
  ],
};

// Applied before paint to avoid a flash of the wrong theme. Runs outside React.
const themeScript = `(function(){try{var t=localStorage.getItem('triage-theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
