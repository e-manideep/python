import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={clsx("rounded-2xl border border-ink-100 bg-white", padded && "p-5 sm:p-6", className)}>{children}</div>;
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
      <div>
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-1">{eyebrow}</div>}
        <h2 className="font-display text-2xl sm:text-[1.7rem] text-ink-950 leading-tight">{title}</h2>
        {description && <p className="text-ink-500 text-sm mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: { direction: "up" | "down" | "flat"; label: string; positive?: boolean } }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className="font-display text-[1.9rem] leading-tight text-ink-950">{value}</div>
      {sub && <div className="text-sm text-ink-500">{sub}</div>}
      {trend && (
        <div className={clsx("text-xs font-semibold mt-1 inline-flex items-center gap-1 w-fit", trend.positive === false ? "text-score-risk" : trend.positive ? "text-score-excellent" : "text-ink-500")}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.label}
        </div>
      )}
    </Card>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "bronze" | "risk" | "watch" | "good" }) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-100 text-ink-700",
    bronze: "bg-bronze-100 text-bronze-800",
    risk: "bg-score-risk-bg text-score-risk",
    watch: "bg-score-fair-bg text-score-fair",
    good: "bg-score-good-bg text-score-good",
  };
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-12 px-6 text-ink-500">
      <div className="font-display text-lg text-ink-700 mb-1">{title}</div>
      {description && <p className="text-sm max-w-md mx-auto">{description}</p>}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", type = "button", disabled, className }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost"; type?: "button" | "submit"; disabled?: boolean; className?: string }) {
  const variants: Record<string, string> = {
    primary: "bg-ink-950 text-white hover:bg-ink-800",
    secondary: "bg-white text-ink-900 border border-ink-200 hover:bg-ink-50",
    ghost: "text-ink-600 hover:bg-ink-100",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={clsx("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed", variants[variant], className)}>
      {children}
    </button>
  );
}
