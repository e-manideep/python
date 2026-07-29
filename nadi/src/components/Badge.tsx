import { titleCase } from "../lib/format";

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-ink-faint/15 text-ink-soft border-ink-faint/30",
  IN_PROGRESS: "bg-pulse-pale text-pulse border-pulse/30",
  COMPLETED: "bg-good-pale text-good border-good/25",
  NO_SHOW: "bg-critical-pale text-critical border-critical/25",
  NONE: "bg-ink-faint/15 text-ink-soft border-ink-faint/30",
  DRAFTING: "bg-pulse-pale text-pulse border-pulse/30",
  DRAFT: "bg-warn-pale text-warn border-warn/30",
  SIGNED: "bg-good-pale text-good border-good/25",
  DRAFTED: "bg-ink-faint/15 text-ink-soft border-ink-faint/30",
  SENT: "bg-pulse-pale text-pulse border-pulse/30",
  SUBMITTED: "bg-ink-faint/15 text-ink-soft border-ink-faint/30",
  AI_TRIAGED: "bg-pulse-pale text-pulse border-pulse/30",
  UNDER_REVIEW: "bg-pulse-pale text-pulse border-pulse/30",
  QUERY_RAISED: "bg-warn-pale text-warn border-warn/30",
  APPROVED: "bg-good-pale text-good border-good/25",
  PARTIALLY_APPROVED: "bg-good-pale text-good border-good/25",
  SETTLED: "bg-good-pale text-good border-good/25",
  REJECTED: "bg-critical-pale text-critical border-critical/25",
  ACTIVE: "bg-good-pale text-good border-good/25",
  RESOLVED: "bg-ink-faint/15 text-ink-soft border-ink-faint/30",
  DISCONTINUED: "bg-ink-faint/15 text-ink-soft border-ink-faint/30",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-ink-faint/15 text-ink-soft border-ink-faint/30";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${cls}`}>
      {titleCase(status)}
    </span>
  );
}

const RISK_STYLES: Record<string, string> = {
  LOW: "bg-good-pale text-good border-good/25",
  MEDIUM: "bg-warn-pale text-warn border-warn/30",
  HIGH: "bg-critical-pale text-critical border-critical/25",
};

export function RiskBadge({ level, score }: { level: "LOW" | "MEDIUM" | "HIGH"; score: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${RISK_STYLES[level]}`}>
      {level} risk · {score}
    </span>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  MILD: "bg-warn-pale text-warn border-warn/30",
  MODERATE: "bg-warn-pale text-warn border-warn/30",
  SEVERE: "bg-critical-pale text-critical border-critical/25",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.MODERATE}`}>
      {titleCase(severity)}
    </span>
  );
}
