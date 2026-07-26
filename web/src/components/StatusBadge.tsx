import { statusLabel } from "../lib/format";

const STYLES: Record<string, string> = {
  SUBMITTED: "bg-ink-300/15 text-ink-500 border-ink-300/30",
  AI_TRIAGED: "bg-teal-pale text-teal border-teal/25",
  UNDER_REVIEW: "bg-teal-pale text-teal border-teal/25",
  QUERY_RAISED: "bg-amber-pale text-amber border-amber/30",
  APPROVED: "bg-moss-pale text-moss border-moss/25",
  PARTIALLY_APPROVED: "bg-moss-pale text-moss border-moss/25",
  SETTLED: "bg-moss-pale text-moss border-moss/25",
  REJECTED: "bg-rose-pale text-rose border-rose/25",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? "bg-ink-300/15 text-ink-500 border-ink-300/30";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {statusLabel(status)}
    </span>
  );
}

const RISK_STYLES: Record<string, string> = {
  LOW: "bg-moss-pale text-moss border-moss/25",
  MEDIUM: "bg-amber-pale text-amber border-amber/30",
  HIGH: "bg-rose-pale text-rose border-rose/25",
};

export function RiskBadge({ level, score }: { level: "LOW" | "MEDIUM" | "HIGH"; score: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${RISK_STYLES[level]}`}
    >
      {level} RISK · {score}
    </span>
  );
}
