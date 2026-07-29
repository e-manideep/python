import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        {eyebrow && <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">{eyebrow}</div>}
        <h3 className="font-display text-[15px] font-semibold text-ink">{title}</h3>
      </div>
      {action}
    </div>
  );
}
