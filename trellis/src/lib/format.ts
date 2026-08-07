export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

/** Indian Lakh/Crore compact notation — what every real estate P&L in this market actually uses. */
export function formatINRCompact(amount: number, digits = 1): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(digits)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(digits)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(digits)} K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function signed(n: number, digits = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;
}
