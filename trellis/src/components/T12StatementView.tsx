import type { T12Statement } from "../lib/financialStatements";
import { downloadCSV, rowsToCSV } from "../lib/csv";
import { formatINRCompact } from "../lib/format";
import { Button } from "./ui";

export function T12StatementView({ statement, title, filename }: { statement: T12Statement; title: string; filename: string }) {
  function exportCSV() {
    const rows = [
      ...statement.income.map((l) => ({ Section: "Income", Line: l.label, ...Object.fromEntries(statement.monthLabels.map((m, i) => [m, l.monthly[i]])), Total: l.total })),
      { Section: "Income", Line: "Total Income", ...Object.fromEntries(statement.monthLabels.map((m, i) => [m, statement.totalIncomeByMonth[i]])), Total: statement.totalIncome },
      ...statement.expenses.map((l) => ({ Section: "Expense", Line: l.label, ...Object.fromEntries(statement.monthLabels.map((m, i) => [m, l.monthly[i]])), Total: l.total })),
      { Section: "Expense", Line: "Total Expenses", ...Object.fromEntries(statement.monthLabels.map((m, i) => [m, statement.totalExpensesByMonth[i]])), Total: statement.totalExpenses },
      { Section: "Result", Line: "Net Operating Income", ...Object.fromEntries(statement.monthLabels.map((m, i) => [m, statement.noiByMonth[i]])), Total: statement.noi },
    ];
    downloadCSV(filename, rowsToCSV(rows));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-sm font-semibold text-ink-800">{title} — Trailing 12 Months</div>
        <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
      </div>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="text-left text-ink-500 uppercase tracking-wide border-y border-ink-100">
              <th className="py-2 pr-3 font-medium sticky left-0 bg-white">Line item</th>
              {statement.monthLabels.map((m) => (
                <th key={m} className="py-2 px-2 font-medium text-right whitespace-nowrap">{m}</th>
              ))}
              <th className="py-2 pl-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={statement.monthLabels.length + 2} className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-bronze-700">
                Income
              </td>
            </tr>
            {statement.income.map((line) => (
              <tr key={line.label} className="border-b border-ink-50">
                <td className="py-1.5 pr-3 text-ink-700 sticky left-0 bg-white">{line.label}</td>
                {line.monthly.map((v, i) => (
                  <td key={i} className="py-1.5 px-2 text-right font-mono text-ink-500">{formatINRCompact(v, 1)}</td>
                ))}
                <td className="py-1.5 pl-2 text-right font-mono font-semibold text-ink-900">{formatINRCompact(line.total, 1)}</td>
              </tr>
            ))}
            <tr className="border-b border-ink-200 font-semibold">
              <td className="py-1.5 pr-3 text-ink-900 sticky left-0 bg-white">Total Income</td>
              {statement.totalIncomeByMonth.map((v, i) => (
                <td key={i} className="py-1.5 px-2 text-right font-mono text-ink-800">{formatINRCompact(v, 1)}</td>
              ))}
              <td className="py-1.5 pl-2 text-right font-mono text-ink-950">{formatINRCompact(statement.totalIncome, 1)}</td>
            </tr>

            <tr>
              <td colSpan={statement.monthLabels.length + 2} className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-bronze-700">
                Operating Expenses
              </td>
            </tr>
            {statement.expenses.map((line) => (
              <tr key={line.label} className="border-b border-ink-50">
                <td className="py-1.5 pr-3 text-ink-700 sticky left-0 bg-white">{line.label}</td>
                {line.monthly.map((v, i) => (
                  <td key={i} className="py-1.5 px-2 text-right font-mono text-ink-500">{formatINRCompact(v, 1)}</td>
                ))}
                <td className="py-1.5 pl-2 text-right font-mono font-semibold text-ink-900">{formatINRCompact(line.total, 1)}</td>
              </tr>
            ))}
            <tr className="border-b border-ink-200 font-semibold">
              <td className="py-1.5 pr-3 text-ink-900 sticky left-0 bg-white">Total Operating Expenses</td>
              {statement.totalExpensesByMonth.map((v, i) => (
                <td key={i} className="py-1.5 px-2 text-right font-mono text-ink-800">{formatINRCompact(v, 1)}</td>
              ))}
              <td className="py-1.5 pl-2 text-right font-mono text-ink-950">{formatINRCompact(statement.totalExpenses, 1)}</td>
            </tr>

            <tr className="font-bold">
              <td className="py-2 pr-3 text-ink-950 sticky left-0 bg-white">Net Operating Income</td>
              {statement.noiByMonth.map((v, i) => (
                <td key={i} className="py-2 px-2 text-right font-mono text-score-good">{formatINRCompact(v, 1)}</td>
              ))}
              <td className="py-2 pl-2 text-right font-mono text-score-good">{formatINRCompact(statement.noi, 1)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
