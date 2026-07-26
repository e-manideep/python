import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-white shadow-card ${className}`}>{children}</div>;
}

export function CardHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        {eyebrow && (
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300">{eyebrow}</div>
        )}
        <h3 className="font-serif text-lg font-medium text-ink">{title}</h3>
      </div>
      {action}
    </div>
  );
}
