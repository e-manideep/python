// Deterministic PRNG (mulberry32) so the demo dataset is stable across
// reloads and every viewer of the app sees the same numbers.

export function mulberry32(seed: number) {
  let a = seed;
  return function rand(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next: () => number;

  constructor(seed: number) {
    this.next = mulberry32(seed);
  }

  float(min = 0, max = 1): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  bool(pTrue = 0.5): boolean {
    return this.next() < pTrue;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  pickWeighted<T>(items: readonly [T, number][]): T {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = this.float(0, total);
    for (const [item, w] of items) {
      if (r < w) return item;
      r -= w;
    }
    return items[items.length - 1][0];
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  gaussian(mean: number, stdDev: number): number {
    const u1 = Math.max(this.next(), 1e-9);
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}
