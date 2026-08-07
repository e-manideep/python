export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function lastNMonths(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function isoDate(daysFromToday: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.round((b - a) / 86400000);
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function monthIndex(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
}
