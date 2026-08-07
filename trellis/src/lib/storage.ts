const NS = "trellis:v1:";

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode / quota) — demo continues with in-memory state only
  }
}
