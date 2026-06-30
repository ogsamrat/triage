import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── Kicker (mono eyebrow label) ─────────────────────────────────────────── */

export function Kicker({
  children,
  dash = true,
  className,
}: {
  children: ReactNode;
  dash?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("kicker", className)}>
      {dash ? "— " : ""}
      {children}
    </span>
  );
}

/* ── Rule (hairline) ─────────────────────────────────────────────────────── */

export function Rule({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-rule", className)} />;
}

/* ── Section header: kicker on the left, optional aside on the right ──────── */

export function SectionHead({
  kicker,
  aside,
  className,
}: {
  kicker: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5", className)}>
      <div className="flex items-end justify-between gap-4 pb-2">
        <Kicker>{kicker}</Kicker>
        {aside ? <div className="kicker shrink-0">{aside}</div> : null}
      </div>
      <Rule />
    </div>
  );
}

/* ── Button / control styling ────────────────────────────────────────────── */

type Variant = "solid" | "ink" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export function controlClasses(
  variant: Variant = "outline",
  size: Size = "md",
  extra = "",
): string {
  const sizes: Record<Size, string> = {
    sm: "text-[0.7rem] px-2.5 py-1.5 gap-1.5",
    md: "text-[0.76rem] px-4 py-2.5 gap-2",
    lg: "text-[0.82rem] px-5 py-3 gap-2",
  };
  const variants: Record<Variant, string> = {
    solid:
      "bg-signal text-paper border border-signal hover:brightness-110 active:brightness-95",
    ink: "bg-ink text-paper border border-ink hover:bg-transparent hover:text-ink",
    outline:
      "bg-transparent text-ink border border-ink/70 hover:bg-ink hover:text-paper hover:border-ink",
    ghost:
      "bg-transparent text-ink-soft border border-transparent hover:text-ink underline-offset-4 hover:underline px-0",
  };
  return cn(
    "inline-flex items-center justify-center select-none rounded-[2px] font-mono uppercase tracking-[0.08em] leading-none transition-colors duration-200 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-soft cursor-pointer",
    variant === "ghost" ? "" : sizes[size],
    variant === "ghost" ? "text-[0.74rem] gap-1.5" : "",
    variants[variant],
    extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "outline",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={controlClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

/* ── Icon button (square, bordered) ──────────────────────────────────────── */

export function IconButton({
  label,
  active,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "grid place-items-center h-9 w-9 rounded-[2px] border transition-colors duration-200 cursor-pointer",
        active
          ? "border-signal text-signal bg-signal/10"
          : "border-rule text-ink hover:border-ink hover:bg-paper-2",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── Panel (bordered surface) ────────────────────────────────────────────── */

export function Panel({
  children,
  className,
  inset,
}: {
  children: ReactNode;
  className?: string;
  inset?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[3px] border border-rule",
        inset ? "bg-paper-2" : "bg-paper",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── Big index numeral ───────────────────────────────────────────────────── */

export function Numeral({
  n,
  className,
}: {
  n: number;
  className?: string;
}) {
  return (
    <span className={cn("type-numeral", className)}>
      {n < 10 ? `0${n}` : n}
    </span>
  );
}
